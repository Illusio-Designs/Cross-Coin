const { Order } = require("../model/orderModel.js");
const { OrderItem } = require("../model/orderItemModel.js");
const { OrderStatusHistory } = require("../model/orderStatusHistoryModel.js");
const { Product } = require("../model/productModel.js");
const { ProductVariation } = require("../model/productVariationModel.js");
const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { ShippingFee } = require("../model/shippingFeeModel.js");
const { Payment } = require("../model/paymentModel.js");
const { User } = require("../model/userModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const { ProductImage } = require("../model/productImageModel.js");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.js");
const {
  createShiprocketOrder,
  getShiprocketTracking,
  getShiprocketLabel,
  requestShiprocketPickup,
  cancelShiprocketShipment,
  getAllShiprocketOrders,
  authenticateShiprocket,
} = require("../services/shiprocketService.js");
const { setImmediate } = require("timers");
const { sendFacebookEvent } = require("../integration/facebookPixel.js");

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${year}${month}${day}-${random}`;
};

// Calculate shipping fee based on payment type
const calculateShippingFee = async (paymentType) => {
  try {
    const orderType = paymentType === "cod" ? "cod" : "prepaid";
    const shippingFee = await ShippingFee.findOne({ where: { orderType } });
    return shippingFee ? shippingFee.fee : orderType === "cod" ? 5.99 : 0.0;
  } catch (error) {
    console.error("Error calculating shipping fee:", error);
    return orderType === "cod" ? 5.99 : 0.0; // Default values if calculation fails
  }
};

// Create a new order
module.exports.createOrder = async (req, res) => {
  console.log("createOrder: Starting order creation...");
  const transaction = await sequelize.transaction();

  try {
    const {
      shipping_address_id,
      items,
      payment_type,
      notes,
      coupon_id,
      discount_amount,
    } = req.body;
    const userId = req.user.id;
    console.log("createOrder: Request data:", {
      shipping_address_id,
      items,
      payment_type,
      notes,
      coupon_id,
      discount_amount,
    });
    console.log("createOrder: User ID:", userId);

    if (!shipping_address_id || !items || !payment_type) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Shipping address, items, and payment type are required",
      });
    }

    console.log("createOrder: Validating shipping address...");
    // Validate shipping address belongs to user
    const shippingAddress = await ShippingAddress.findOne({
      where: { id: shipping_address_id, user_id: userId },
    });

    if (!shippingAddress) {
      await transaction.rollback();
      return res.status(404).json({ message: "Shipping address not found" });
    }
    console.log("createOrder: Shipping address validated");

    // Calculate total amount and validate items
    let totalAmount = 0;
    const validatedItems = [];

    console.log(
      "createOrder: Starting item validation for",
      items.length,
      "items"
    );
    for (const item of items) {
      const { product_id, quantity } = item;
      let { variation_id } = item; // Use a local, mutable variation_id

      if (!product_id || !quantity) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Product ID and quantity are required for each item",
        });
      }

      console.log("createOrder: Validating product", product_id);
      const product = await Product.findByPk(product_id);
      if (!product) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ message: `Product with ID ${product_id} not found` });
      }
      console.log("createOrder: Product validated:", product.name);

      let price;
      let stockAvailable;
      let variation;
      if (variation_id) {
        console.log("createOrder: Validating variation", variation_id);
        variation = await ProductVariation.findByPk(variation_id);
        if (!variation || variation.productId !== product_id) {
          await transaction.rollback();
          return res
            .status(404)
            .json({ message: `Invalid variation for product ${product_id}` });
        }
        price = variation.price;
        stockAvailable = variation.stock;
        console.log(
          "createOrder: Variation validated, price:",
          price,
          "stock:",
          stockAvailable
        );
      } else {
        const variations = await ProductVariation.findAll({
          where: { productId: product_id },
        });
        if (variations.length > 0) {
          // If variations exist but none was chosen, default to the first one
          variation = variations[0];
          variation_id = variation.id; // Assign to the local variable
          price = variation.price;
          stockAvailable = variation.stock;
        } else {
          price = product.price;
          stockAvailable = product.stock_quantity;
        }

        if (!price || price <= 0) {
          await transaction.rollback();
          return res
            .status(400)
            .json({ message: `No price found for product ${product_id}` });
        }
      }

      // STOCK CHECK
      console.log(
        "createOrder: Stock check - available:",
        stockAvailable,
        "requested:",
        quantity
      );
      if (typeof stockAvailable !== "number" || stockAvailable < quantity) {
        await transaction.rollback();
        return res.status(400).json({
          message: `Product is out of stock or insufficient quantity for product ${product_id}`,
        });
      }
      console.log("createOrder: Stock check passed");

      // Apply discount if exists (simplified version)
      let discount = 0;
      // You would add discount calculation logic here

      const subtotal = price * quantity - discount;
      totalAmount += subtotal;

      validatedItems.push({
        product_id,
        variation_id: variation_id || null, // Use the local variable
        quantity,
        price,
        discount,
        subtotal,
        _variation: variation, // Pass the variation instance for later stock decrement
      });
    }

    const subTotal = Number(totalAmount);
    const appliedDiscount = discount_amount ? Number(discount_amount) : 0;
    const shippingFee = Number(await calculateShippingFee(payment_type));
    const finalAmount = subTotal - appliedDiscount + shippingFee;
    console.log("subTotal:", subTotal);
    console.log("appliedDiscount:", appliedDiscount);
    console.log("shippingFee:", shippingFee);
    console.log("finalAmount:", finalAmount);
    // Create order
    const order = await Order.create(
      {
        order_number: generateOrderNumber(),
        user_id: userId,
        total_amount: subTotal,
        discount_amount: appliedDiscount,
        coupon_id: coupon_id || null,
        shipping_fee: shippingFee,
        final_amount: finalAmount,
        payment_type,
        payment_status: "pending",
        status: "pending",
        notes: notes || null,
      },
      { transaction }
    );
    console.log("createOrder: Order created with ID:", order.id);

    // Create order items
    for (const item of validatedItems) {
      await OrderItem.create(
        {
          order_id: order.id,
          product_id: item.product_id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        },
        { transaction }
      );

      // DECREMENT STOCK
      if (item._variation) {
        item._variation.stock -= item.quantity;
        await item._variation.save({ transaction });
      } else {
        // If no variation, decrement product stock_quantity
        const product = await Product.findByPk(item.product_id);
        if (product) {
          product.stock_quantity =
            (product.stock_quantity || 0) - item.quantity;
          await product.save({ transaction });
        }
      }
    }

    // Create initial status history
    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status: "pending",
        updated_by: userId,
      },
      { transaction }
    );

    // If payment type is not COD, create a payment record
    if (payment_type !== "cod") {
      await Payment.create(
        {
          order_id: order.id,
          user_id: userId,
          payment_type,
          amount_paid: finalAmount,
          status: "pending",
        },
        { transaction }
      );
    }

    console.log("createOrder: Committing transaction...");
    await transaction.commit();
    console.log("createOrder: Transaction committed successfully");

    // Fetch the created order with its items
    console.log("createOrder: Fetching created order with details...");
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, include: [Product] },
        { model: User, attributes: ["id", "username", "email"] },
        { model: OrderStatusHistory, order: [["updated_at", "DESC"]] },
      ],
    });
    console.log("createOrder: Order fetched successfully");

    // Shiprocket integration - moved to background to avoid blocking order creation
    try {
      // Get shipping address separately
      const address = await ShippingAddress.findByPk(shipping_address_id);
      const user = createdOrder.User;

      // Validate address and phone
      if (!address || !address.address_line1 || !address.phone) {
        console.error(
          `Order ${createdOrder.order_number}: Missing address or phone, cannot sync to Shiprocket.`
        );
      } else {
        const orderItems = createdOrder.OrderItems.map((item) => ({
          product_name: item.Product.name,
          sku: item.Product.sku || "",
          quantity: item.quantity,
          price: item.price,
        }));

        // Format phone number function
        const formatPhoneNumber = (phone) => {
          if (!phone) return "9876543210";
          const digits = phone.toString().replace(/\D/g, "");

          if (digits.length === 12 && digits.startsWith("91")) {
            return digits.substring(2);
          }

          if (digits.length === 11 && digits.startsWith("0")) {
            return digits.substring(1);
          }

          if (digits.length === 10) {
            return digits;
          }

          if (digits.length < 10) {
            return "9876543210";
          }

          if (digits.length > 10) {
            return digits.slice(-10);
          }

          return "9876543210";
        };

        const shiprocketPayload = {
          order_id: String(createdOrder.order_number),
          order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
          pickup_location: "warehouse",
          channel_id: "7361105",
          comment: `Order from Cross-Coin: ${createdOrder.order_number}`,
          billing_customer_name: String(user.username),
          billing_last_name: "",
          billing_address: String(address.address || "Default Address"),
          billing_address_2: "",
          billing_city: String(address.city || "Mumbai"),
          billing_pincode: parseInt(address.pincode) || 400001,
          billing_state: String(address.state || "Maharashtra"),
          billing_country: String(address.country || "India"),
          billing_email: String(user.email),
          billing_phone: formatPhoneNumber(address.phone),
          shipping_is_billing: true,
          shipping_customer_name: String(user.username),
          shipping_last_name: "",
          shipping_address: String(address.address || "Default Address"),
          shipping_address_2: "",
          shipping_city: String(address.city || "Mumbai"),
          shipping_pincode: parseInt(address.pincode) || 400001,
          shipping_state: String(address.state || "Maharashtra"),
          shipping_country: String(address.country || "India"),
          shipping_email: String(user.email),
          shipping_phone: formatPhoneNumber(address.phone),
          order_items: orderItems.map((item) => ({
            name: String(item.product_name),
            sku: String(item.sku || `PROD-${item.product_id || Date.now()}`),
            units: parseInt(item.quantity),
            selling_price: parseFloat(item.price),
            discount: 0,
            tax: 0,
            hsn: 441122,
          })),
          payment_method:
            createdOrder.payment_type === "cod" ? "COD" : "Prepaid",
          shipping_charges: 0,
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: parseFloat(createdOrder.total_amount),
          length: 10,
          breadth: 15,
          height: 20,
          weight: 2.5,
        };

        // Run Shiprocket integration in background
        setImmediate(async () => {
          try {
            const shipRes = await createShiprocketOrder(shiprocketPayload);
            await createdOrder.update({
              shiprocket_order_id: shipRes.order_id,
              shiprocket_shipment_id:
                shipRes.shipments?.[0]?.shipment_id || null,
            });
            console.log("✅ Shiprocket Order Created:", shipRes.order_id);
          } catch (err) {
            console.error("❌ Failed to create Shiprocket order:", err.message);
          }
        });
      }
    } catch (err) {
      console.error("❌ Failed to prepare Shiprocket order:", err.message);
    }

    console.log("createOrder: Sending success response...");
    res.status(201).json({
      message: "Order created successfully",
      order: createdOrder,
    });
    console.log("createOrder: Response sent successfully");

    // --- Auto-sync all unsynced orders with Shiprocket in the background ---
    try {
      setImmediate(async () => {
        try {
          await module.exports.syncOrdersWithShiprocket(
            {
              user: req.user,
              headers: req.headers,
              body: {},
              query: {},
            },
            {
              status: () => ({ json: () => {} }),
              json: () => {},
            }
          );
        } catch (err) {
          console.error("Background Shiprocket sync failed:", err.message);
        }
      });
    } catch (err) {
      console.error(
        "Failed to trigger background Shiprocket sync:",
        err.message
      );
    }
  } catch (error) {
    console.error("createOrder: Error caught:", error.message);
    console.error("createOrder: Error stack:", error.stack);
    await transaction.rollback();
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ message: "Failed to create order", error: error.message });
  }
};

// Create guest checkout order
module.exports.createGuestOrder = async (req, res) => {
  console.log("createGuestOrder: Starting guest order creation...");
  const transaction = await sequelize.transaction();

  try {
    const {
      guest_info,
      shipping_address,
      items,
      payment_type,
      notes,
      coupon_id,
      discount_amount,
      session_id,
      ip_address,
      user_agent,
    } = req.body;

    console.log("createGuestOrder: Request data:", {
      guest_info,
      shipping_address,
      items,
      payment_type,
      notes,
      coupon_id,
      discount_amount,
    });

    // Validate required fields
    if (!guest_info || !shipping_address || !items || !payment_type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Guest info, shipping address, items, and payment type are required",
      });
    }

    // Validate guest info
    const { email, firstName, lastName, phone } = guest_info;
    if (!email || !firstName || !lastName) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Email, first name, and last name are required",
      });
    }

    // Validate shipping address
    const {
      fullName,
      address,
      city,
      state,
      pincode,
      phone: shippingPhone,
    } = shipping_address;

    if (!fullName || !address || !city || !state || !pincode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Complete shipping address is required",
      });
    }

    console.log("createGuestOrder: Creating guest user...");
    // Create or find guest user
    let guestUser = await GuestUser.findOne({
      where: { email: email.toLowerCase() },
      transaction,
    });

    if (!guestUser) {
      guestUser = await GuestUser.create(
        {
          email: email.toLowerCase(),
          firstName,
          lastName,
          phone,
          sessionId: session_id,
          ipAddress: ip_address,
          userAgent: user_agent,
          status: "active",
        },
        { transaction }
      );
    } else {
      // Update existing guest user info
      await guestUser.update(
        {
          firstName,
          lastName,
          phone,
          sessionId: session_id,
          ipAddress: ip_address,
          userAgent: user_agent,
        },
        { transaction }
      );
    }

    console.log("createGuestOrder: Guest user created/found:", guestUser.id);

    // Calculate total amount and validate items
    let totalAmount = 0;
    const validatedItems = [];

    console.log(
      "createGuestOrder: Starting item validation for",
      items.length,
      "items"
    );
    for (const item of items) {
      const { product_id, quantity } = item;
      let { variation_id } = item;

      if (!product_id || !quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Product ID and quantity are required for each item",
        });
      }

      const product = await Product.findByPk(product_id, {
        include: [
          { model: ProductVariation, as: "ProductVariations" },
          { model: ProductImage, as: "ProductImages" },
        ],
        transaction,
      });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Product with ID ${product_id} not found`,
        });
      }

      // If no variation_id provided, use the first available variation
      if (
        !variation_id &&
        product.ProductVariations &&
        product.ProductVariations.length > 0
      ) {
        variation_id = product.ProductVariations[0].id;
      }

      let variation = null;
      if (variation_id) {
        variation = await ProductVariation.findByPk(variation_id, {
          transaction,
        });
        if (!variation || variation.productId !== product_id) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Product variation with ID ${variation_id} not found for product ${product_id}`,
          });
        }
      }

      const price = variation ? variation.price : product.price;
      const itemTotal = price * quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product,
        variation,
        quantity,
        price,
        itemTotal,
      });
    }

    console.log(
      "createGuestOrder: Items validated. Total amount:",
      totalAmount
    );

    // Calculate shipping fee
    const shippingFee = await calculateShippingFee(payment_type);
    console.log("createGuestOrder: Shipping fee calculated:", shippingFee);

    // Apply discount if provided
    let finalDiscountAmount = 0;
    if (discount_amount && discount_amount > 0) {
      finalDiscountAmount = Math.min(discount_amount, totalAmount);
    }

    const finalAmount = totalAmount + shippingFee - finalDiscountAmount;
    console.log("createGuestOrder: Final amount calculated:", finalAmount);

    // Generate order number
    const orderNumber = generateOrderNumber();
    console.log("createGuestOrder: Order number generated:", orderNumber);

    // Create order
    const order = await Order.create(
      {
        guest_user_id: guestUser.id,
        order_number: orderNumber,
        total_amount: totalAmount,
        discount_amount: finalDiscountAmount,
        shipping_fee: shippingFee,
        final_amount: finalAmount,
        payment_type: payment_type,
        coupon_id: coupon_id || null,
        status: "pending",
        payment_status: payment_type === "cod" ? "pending" : "pending",
        notes: notes || null,
      },
      { transaction }
    );

    console.log("createGuestOrder: Order created with ID:", order.id);

    // Create order items
    for (const item of validatedItems) {
      await OrderItem.create(
        {
          order_id: order.id,
          product_id: item.product.id,
          variation_id: item.variation ? item.variation.id : null,
          quantity: item.quantity,
          price: item.price,
          discount: 0.0, // Default discount for guest orders
          subtotal: item.itemTotal, // Add the required subtotal field
          status: "pending",
        },
        { transaction }
      );
    }

    console.log("createGuestOrder: Order items created");

    // Create shipping address for guest
    const guestShippingAddress = await ShippingAddress.create(
      {
        guest_user_id: guestUser.id,
        full_name: fullName,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        phone: shippingPhone,
        is_default: true,
      },
      { transaction }
    );

    // Update order with shipping address
    await order.update(
      {
        shipping_address_id: guestShippingAddress.id,
      },
      { transaction }
    );

    console.log(
      "createGuestOrder: Shipping address created and linked to order"
    );

    // Create initial order status history
    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status: "pending",
        notes: "Order created via guest checkout",
        updated_by: null, // No user ID for guest orders
        created_by: "system",
      },
      { transaction }
    );

    console.log("createGuestOrder: Order status history created");

    // Create payment record
    await Payment.create(
      {
        order_id: order.id,
        guest_user_id: guestUser.id, // Use guest_user_id instead of user_id
        payment_type: payment_type, // Use payment_type instead of payment_method
        amount_paid: finalAmount, // Use amount_paid instead of amount
        status: payment_type === "cod" ? "pending" : "pending",
        transaction_id: null,
      },
      { transaction }
    );

    console.log("createGuestOrder: Payment record created");

    // Commit transaction
    await transaction.commit();
    console.log("createGuestOrder: Transaction committed successfully");

    // Send Facebook event for guest checkout
    try {
      await sendFacebookEvent("InitiateCheckout", {
        total_amount: finalAmount,
        currency: "INR",
        items: validatedItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        ip_address: req.ip || "127.0.0.1",
        user_agent: req.headers["user-agent"] || "guest-checkout",
      });
    } catch (fbError) {
      console.error(
        "createGuestOrder: Facebook event error (non-critical):",
        fbError
      );
    }

    // Create Shiprocket order automatically for guest orders
    setImmediate(async () => {
      try {
        console.log(
          "createGuestOrder: Creating Shiprocket order for guest order:",
          order.order_number
        );

        // Format phone number function
        const formatPhoneNumber = (phone) => {
          if (!phone) return "9876543210";
          const digits = phone.toString().replace(/\D/g, "");

          if (digits.length === 12 && digits.startsWith("91")) {
            return digits.substring(2);
          }

          if (digits.length === 11 && digits.startsWith("0")) {
            return digits.substring(1);
          }

          if (digits.length === 10) {
            return digits;
          }

          if (digits.length < 10) {
            return "9876543210";
          }

          if (digits.length > 10) {
            return digits.slice(-10);
          }

          return "9876543210";
        };

        // Prepare Shiprocket payload for guest order
        const shiprocketPayload = {
          order_id: String(order.order_number),
          order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
          pickup_location: "warehouse",
          channel_id: "7361105",
          comment: `Guest order from Cross-Coin: ${order.order_number}`,
          billing_customer_name: String(guestUser.firstName),
          billing_last_name: String(guestUser.lastName || ""),
          billing_address: String(
            guestShippingAddress.address || "Default Address"
          ),
          billing_address_2: "",
          billing_city: String(guestShippingAddress.city || "Mumbai"),
          billing_pincode: parseInt(guestShippingAddress.pincode) || 400001,
          billing_state: String(guestShippingAddress.state || "Maharashtra"),
          billing_country: String(guestShippingAddress.country || "India"),
          billing_email: String(guestUser.email),
          billing_phone: formatPhoneNumber(
            guestShippingAddress.phone || guestUser.phone
          ),
          shipping_is_billing: true,
          shipping_customer_name: String(guestUser.firstName),
          shipping_last_name: String(guestUser.lastName || ""),
          shipping_address: String(
            guestShippingAddress.address || "Default Address"
          ),
          shipping_address_2: "",
          shipping_city: String(guestShippingAddress.city || "Mumbai"),
          shipping_pincode: parseInt(guestShippingAddress.pincode) || 400001,
          shipping_state: String(guestShippingAddress.state || "Maharashtra"),
          shipping_country: String(guestShippingAddress.country || "India"),
          shipping_email: String(guestUser.email),
          shipping_phone: formatPhoneNumber(
            guestShippingAddress.phone || guestUser.phone
          ),
          order_items: validatedItems.map((item) => ({
            name: String(item.product.name),
            sku: String(item.product.sku || `PROD-${item.product.id}`),
            units: parseInt(item.quantity),
            selling_price: parseFloat(item.price),
            discount: 0,
            tax: 0,
            hsn: parseInt(item.product.hsn_code || 9999),
          })),
          payment_method: payment_type === "cod" ? "COD" : "Prepaid",
          shipping_charges: 0,
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: parseFloat(totalAmount),
          length: 10,
          breadth: 15,
          height: 20,
          weight: 2.5,
        };

        console.log(
          "createGuestOrder: Shiprocket payload prepared:",
          shiprocketPayload
        );

        const shiprocketResponse = await createShiprocketOrder(
          shiprocketPayload
        );

        // Update order with Shiprocket IDs
        await order.update({
          shiprocket_order_id: shiprocketResponse.order_id || null,
          shiprocket_shipment_id:
            (shiprocketResponse.shipments &&
              shiprocketResponse.shipments[0]?.shipment_id) ||
            null,
        });

        console.log(
          "createGuestOrder: ✅ Shiprocket Order Created for guest:",
          {
            order_number: order.order_number,
            shiprocket_order_id: shiprocketResponse.order_id,
            shipment_id: shiprocketResponse.shipments?.[0]?.shipment_id,
          }
        );

        // Request pickup if shipment ID exists
        if (
          shiprocketResponse.shipments &&
          shiprocketResponse.shipments[0]?.shipment_id
        ) {
          try {
            const pickupResponse = await requestShiprocketPickup([
              shiprocketResponse.shipments[0].shipment_id,
            ]);
            console.log(
              "createGuestOrder: ✅ Shiprocket Pickup Requested:",
              pickupResponse
            );
          } catch (pickupError) {
            console.error(
              "createGuestOrder: ❌ Failed to request Shiprocket pickup:",
              pickupError.message
            );
          }
        }
      } catch (shiprocketError) {
        console.error(
          "createGuestOrder: ❌ Failed to create Shiprocket order for guest:",
          {
            order_number: order.order_number,
            error: shiprocketError.message,
            response: shiprocketError.response?.data,
          }
        );
      }
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: "Guest order created successfully",
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          shipping_fee: order.shipping_fee,
          discount_amount: order.discount_amount,
          final_amount: order.final_amount,
          payment_type: order.payment_type,
          status: order.status,
          payment_status: order.payment_status,
          created_at: order.created_at,
        },
        guest_user: {
          id: guestUser.id,
          email: guestUser.email,
          firstName: guestUser.firstName,
          lastName: guestUser.lastName,
          phone: guestUser.phone,
        },
        shipping_address: {
          id: guestShippingAddress.id,
          full_name: guestShippingAddress.full_name,
          address: guestShippingAddress.address,
          city: guestShippingAddress.city,
          state: guestShippingAddress.state,
          pincode: guestShippingAddress.pincode,
          phone: guestShippingAddress.phone,
        },
        items: validatedItems.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          variation_id: item.variation ? item.variation.id : null,
          quantity: item.quantity,
          price: item.price,
          total_price: item.itemTotal,
        })),
      },
    });
  } catch (error) {
    console.error("createGuestOrder: Error caught:", error.message);
    console.error("createGuestOrder: Error stack:", error.stack);
    await transaction.rollback();
    console.error("Error creating guest order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create guest order",
      error: error.message,
    });
  }
};

// Get guest order by email and order number
module.exports.getGuestOrder = async (req, res) => {
  try {
    const { email, orderNumber } = req.query;

    if (!email || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Email and order number are required",
      });
    }

    // Find guest user by email
    const guestUser = await GuestUser.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!guestUser) {
      return res.status(404).json({
        success: false,
        message: "Guest order not found",
      });
    }

    // Find order by order number and guest user
    const order = await Order.findOne({
      where: {
        order_number: orderNumber,
        guest_user_id: guestUser.id,
      },
      include: [
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
        },
        {
          model: ShippingAddress,
          as: "ShippingAddress",
          attributes: [
            "id",
            "full_name",
            "address",
            "city",
            "state",
            "pincode",
            "phone",
          ],
        },
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            {
              model: Product,
              as: "Product",
              attributes: ["id", "name", "slug"],
              include: [
                {
                  model: ProductImage,
                  as: "ProductImages",
                  attributes: ["image_url"],
                  limit: 1,
                },
              ],
            },
            {
              model: ProductVariation,
              as: "ProductVariation",
              attributes: ["id", "name", "price"],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: "OrderStatusHistories",
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Guest order not found",
      });
    }

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          shipping_fee: order.shipping_fee,
          discount_amount: order.discount_amount,
          final_amount: order.final_amount,
          payment_type: order.payment_type,
          status: order.status,
          payment_status: order.payment_status,
          created_at: order.created_at,
          updated_at: order.updated_at,
        },
        guest_user: order.GuestUser,
        shipping_address: order.ShippingAddress,
        items: order.OrderItems.map((item) => ({
          id: item.id,
          product: {
            id: item.Product.id,
            name: item.Product.name,
            slug: item.Product.slug,
            image: item.Product.ProductImages?.[0]?.image_url || null,
          },
          variation: item.ProductVariation
            ? {
                id: item.ProductVariation.id,
                name: item.ProductVariation.name,
                price: item.ProductVariation.price,
              }
            : null,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
        })),
        status_history: order.OrderStatusHistories.map((history) => ({
          id: history.id,
          status: history.status,
          notes: history.notes,
          created_at: history.created_at,
          created_by: history.created_by,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching guest order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch guest order",
      error: error.message,
    });
  }
};

// Track order by AWB number (works for both registered and guest orders)
module.exports.trackOrderByAWB = async (req, res) => {
  try {
    const { awb_number } = req.query;

    if (!awb_number) {
      return res.status(400).json({
        success: false,
        message: "AWB number is required",
      });
    }

    // Find order by tracking number (AWB)
    const order = await Order.findOne({
      where: { tracking_number: awb_number },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "email", "firstName", "lastName"],
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName"],
        },
        {
          model: ShippingAddress,
          as: "ShippingAddress",
          attributes: [
            "id",
            "full_name",
            "address",
            "city",
            "state",
            "pincode",
            "phone",
          ],
        },
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            {
              model: Product,
              as: "Product",
              attributes: ["id", "name", "slug"],
              include: [
                {
                  model: ProductImage,
                  as: "ProductImages",
                  attributes: ["image_url"],
                  limit: 1,
                },
              ],
            },
            {
              model: ProductVariation,
              as: "ProductVariation",
              attributes: ["id", "name", "price"],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: "OrderStatusHistories",
          order: [["created_at", "DESC"]],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found with this AWB number",
      });
    }

    // Determine if it's a guest order or registered user order
    const isGuestOrder = !!order.guest_user_id;
    const customerInfo = isGuestOrder ? order.GuestUser : order.User;

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          shipping_fee: order.shipping_fee,
          discount_amount: order.discount_amount,
          final_amount: order.final_amount,
          payment_type: order.payment_type,
          status: order.status,
          payment_status: order.payment_status,
          tracking_number: order.tracking_number,
          courier_name: order.courier_name,
          tracking_url: order.tracking_url,
          created_at: order.created_at,
          updated_at: order.updated_at,
        },
        customer: {
          type: isGuestOrder ? "guest" : "registered",
          info: customerInfo,
        },
        shipping_address: order.ShippingAddress,
        items: order.OrderItems.map((item) => ({
          id: item.id,
          product: {
            id: item.Product.id,
            name: item.Product.name,
            slug: item.Product.slug,
            image: item.Product.ProductImages?.[0]?.image_url || null,
          },
          variation: item.ProductVariation
            ? {
                id: item.ProductVariation.id,
                name: item.ProductVariation.name,
                price: item.ProductVariation.price,
              }
            : null,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
        })),
        status_history: order.OrderStatusHistories.map((history) => ({
          id: history.id,
          status: history.status,
          notes: history.notes,
          created_at: history.created_at,
          created_by: history.created_by,
        })),
      },
    });
  } catch (error) {
    console.error("Error tracking order by AWB:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track order",
      error: error.message,
    });
  }
};

// Handle Shiprocket webhook for order updates
module.exports.handleShiprocketWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("Shiprocket Webhook received:", webhookData);

    const {
      order_id,
      shipment_id,
      status,
      awb_code,
      courier_name,
      tracking_url,
    } = webhookData;

    if (!order_id) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Find order by Shiprocket order ID (which matches our order_number)
    const order = await Order.findOne({
      where: { shiprocket_order_id: order_id },
      include: [
        { model: User, as: "User", attributes: ["id", "email"] },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    });

    if (!order) {
      console.log("Order not found for Shiprocket order ID:", order_id);
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order with Shiprocket tracking information
    const updateData = {};
    if (shipment_id) updateData.shiprocket_shipment_id = shipment_id;
    if (awb_code) updateData.tracking_number = awb_code;
    if (courier_name) updateData.courier_name = courier_name;
    if (tracking_url) updateData.tracking_url = tracking_url;

    // Map Shiprocket status to our order status
    let orderStatus = order.status;
    if (status) {
      switch (status.toLowerCase()) {
        case "shipped":
        case "in_transit":
          orderStatus = "shipped";
          break;
        case "delivered":
          orderStatus = "delivered";
          break;
        case "cancelled":
        case "rto":
          orderStatus = "cancelled";
          break;
        case "returned":
          orderStatus = "returned";
          break;
        default:
          orderStatus = "processing";
      }
      updateData.status = orderStatus;
    }

    if (Object.keys(updateData).length > 0) {
      await order.update(updateData);

      // Add status history entry
      await OrderStatusHistory.create({
        order_id: order.id,
        status: orderStatus,
        notes: `Shiprocket webhook: ${status}${
          awb_code ? ` - AWB: ${awb_code}` : ""
        }${courier_name ? ` - Courier: ${courier_name}` : ""}`,
        created_by: "shiprocket_webhook",
      });

      console.log("Order updated via Shiprocket webhook:", {
        order_number: order.order_number,
        status: orderStatus,
        tracking_number: awb_code,
        courier: courier_name,
      });
    }

    res.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing Shiprocket webhook:", error);
    res
      .status(500)
      .json({ message: "Failed to process webhook", error: error.message });
  }
};

// Get all orders (admin)
module.exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      payment_status,
      start_date,
      end_date,
      page = 1,
      limit = 10,
    } = req.query;

    console.log("=== GET ALL ORDERS DEBUG ===");
    console.log("Query parameters:", {
      status,
      payment_status,
      start_date,
      end_date,
      page,
      limit,
    });

    // First, let's check the total count without any filters
    const totalCount = await Order.count();
    console.log("TOTAL ORDERS IN DATABASE (no filters):", totalCount);

    // Check for suspicious patterns
    const recentOrders = await Order.findAll({
      attributes: ["id", "order_number", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });
    console.log("=== RECENT 10 ORDERS ===");
    recentOrders.forEach((order) => {
      console.log(
        `ID: ${order.id}, Order: ${order.order_number}, Created: ${order.createdAt}`
      );
    });

    // Check for orders created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.count({
      where: {
        createdAt: {
          [Op.gte]: today,
        },
      },
    });
    console.log("ORDERS CREATED TODAY:", todayOrders);

    // Build filter based on query parameters
    const filter = {};
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;

    // Date range filter
    if (start_date && end_date) {
      filter.createdAt = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    // Pagination
    const offset = (page - 1) * limit;

    // Add sorting support
    const sortField = req.query.sort || "createdAt";
    const sortOrder = req.query.order || "DESC";
    const orderClause = [[sortField, sortOrder]];

    const orders = await Order.findAndCountAll({
      where: filter,
      distinct: true,
      col: "id",
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username", "email"],
          required: false,
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName"],
          required: false,
        },
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            {
              model: Product,
              as: "Product",
              include: [{ model: ProductImage, as: "ProductImages" }],
            },
          ],
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(orders.count / limit);

    console.log("Query results:", {
      totalCount: orders.count,
      returnedRows: orders.rows.length,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages,
    });

    // Log all order IDs and details
    console.log("=== ALL ORDER IDs AND DETAILS ===");
    orders.rows.forEach((order, index) => {
      console.log(
        `${index + 1}. ID: ${order.id}, Order: ${order.order_number}, Amount: ${
          order.total_amount
        }, Status: ${order.status}, Created: ${order.createdAt}`
      );
    });

    // Check for duplicate order numbers
    const orderNumbers = orders.rows.map((order) => order.order_number);
    const uniqueOrderNumbers = [...new Set(orderNumbers)];
    console.log("=== DUPLICATE CHECK ===");
    console.log("Total orders returned:", orderNumbers.length);
    console.log("Unique order numbers:", uniqueOrderNumbers.length);
    if (orderNumbers.length !== uniqueOrderNumbers.length) {
      console.log("❌ DUPLICATE ORDER NUMBERS FOUND!");
      const duplicates = orderNumbers.filter(
        (item, index) => orderNumbers.indexOf(item) !== index
      );
      console.log("Duplicate order numbers:", [...new Set(duplicates)]);
    } else {
      console.log("✅ No duplicate order numbers");
    }

    res.json({
      orders: orders.rows,
      total: orders.count,
      totalPages: totalPages,
      pagination: {
        total: orders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error getting orders:", error);
    res
      .status(500)
      .json({ message: "Failed to get orders", error: error.message });
  }
};

// Get user's orders
module.exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {
      user_id: userId,
      [Op.or]: [
        { payment_type: "cod" },
        { payment_status: { [Op.ne]: "pending" } },
      ],
    };
    if (status) filter.status = status;

    // Pagination
    const offset = (page - 1) * limit;

    const orders = await Order.findAndCountAll({
      where: filter,
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              include: [{ model: ProductImage, as: "ProductImages" }],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(orders.count / limit);

    res.json({
      orders: orders.rows,
      pagination: {
        total: orders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error getting user orders:", error);
    res
      .status(500)
      .json({ message: "Failed to get orders", error: error.message });
  }
};

// Get Order by ID
module.exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params; // Assuming the order ID is passed as a URL parameter

    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem }, { model: User }],
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch order", error: error.message });
  }
};

// Update order status
module.exports.updateOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status) {
      await transaction.rollback();
      return res.status(400).json({ message: "Status is required" });
    }

    // Only admin can update status
    if (req.user.role !== "admin") {
      await transaction.rollback();
      return res
        .status(403)
        .json({ message: "Only admin can update order status" });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // Cannot change status if already delivered or cancelled
    if (order.status === "delivered" || order.status === "cancelled") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: `Cannot change status of ${order.status} orders` });
    }

    // Update order status
    order.status = status;
    await order.save({ transaction });

    // Create status history entry
    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status,
        updated_by: userId,
      },
      { transaction }
    );

    // If status is 'cancelled' and payment is 'paid', create refund record
    if (status === "cancelled" && order.payment_status === "paid") {
      const payment = await Payment.findOne({
        where: { order_id: order.id, status: "successful" },
      });

      if (payment) {
        payment.status = "refunded";
        await payment.save({ transaction });

        order.payment_status = "refunded";
        await order.save({ transaction });
      }
    }

    await transaction.commit();

    // Get updated order
    const updatedOrder = await Order.findByPk(orderId, {
      include: [
        { model: OrderItem, include: [Product] },
        { model: User, attributes: ["id", "username", "email"] },
        { model: OrderStatusHistory, order: [["updated_at", "DESC"]] },
        { model: Payment },
      ],
    });

    // Facebook Pixel: Track purchase when order is delivered/completed
    if (status === "delivered" || status === "completed") {
      // Prepare order data for Facebook Pixel
      const orderForPixel = {
        ...updatedOrder.dataValues,
        items: updatedOrder.OrderItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        currency: "INR",
        total_amount: updatedOrder.final_amount,
      };
      sendFacebookEvent("Purchase", orderForPixel).catch(console.error);
    }

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ message: "Failed to update order status", error: error.message });
  }
};

// Cancel order (by user)
module.exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findByPk(orderId);
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify order belongs to user
    if (order.user_id !== userId) {
      await transaction.rollback();
      return res.status(403).json({ message: "Access denied" });
    }

    // Cannot cancel if already delivered or cancelled
    if (order.status === "delivered" || order.status === "cancelled") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: `Cannot cancel ${order.status} orders` });
    }

    // Can only cancel pending or processing orders
    if (order.status !== "pending" && order.status !== "processing") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: `Cannot cancel orders in ${order.status} status` });
    }

    // Update order status
    order.status = "cancelled";
    await order.save({ transaction });

    // Create status history entry with user's reason
    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status: "cancelled",
        updated_by: userId,
        notes: reason,
      },
      { transaction }
    );

    // If payment is 'paid', mark for refund
    if (order.payment_status === "paid") {
      const payment = await Payment.findOne({
        where: { order_id: order.id, status: "successful" },
      });

      if (payment) {
        payment.status = "refunded";
        await payment.save({ transaction });

        order.payment_status = "refunded";
        await order.save({ transaction });
      }
    }

    // Cancel order in Shiprocket if it exists
    if (order.shiprocket_order_id) {
      try {
        const {
          cancelShiprocketOrder,
        } = require("../services/shiprocketService");
        const cancelRes = await cancelShiprocketOrder(
          order.shiprocket_order_id
        );
        if (cancelRes.success) {
          console.log(
            "Shiprocket order cancelled successfully:",
            cancelRes.data
          );
        } else {
          console.error("Failed to cancel Shiprocket order:", cancelRes.error);
        }
      } catch (err) {
        console.error(
          "Failed to cancel Shiprocket order:",
          err?.response?.data || err.message
        );
      }
    }

    // Also cancel shipment if it exists
    if (order.shiprocket_shipment_id) {
      try {
        const cancelRes = await cancelShiprocketShipment([
          order.shiprocket_shipment_id,
        ]);
        console.log("Shiprocket shipment cancelled:", cancelRes);
      } catch (err) {
        console.error(
          "Failed to cancel Shiprocket shipment:",
          err?.response?.data || err.message
        );
      }
    }

    await transaction.commit();

    res.json({
      message: "Order cancelled successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error cancelling order:", error);
    res
      .status(500)
      .json({ message: "Failed to cancel order", error: error.message });
  }
};

// Get order statistics
module.exports.getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.count();
    const totalRevenue = await Order.sum("final_amount");
    const totalPendingOrders = await Order.count({
      where: { status: "pending" },
    });
    const totalDeliveredOrders = await Order.count({
      where: { status: "delivered" },
    });
    const totalCancelledOrders = await Order.count({
      where: { status: "cancelled" },
    });

    res.json({
      totalOrders,
      totalRevenue,
      totalPendingOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
    });
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({
      message: "Failed to fetch order statistics",
      error: error.message,
    });
  }
};

// Get Shiprocket tracking info for an order
module.exports.getShiprocketTrackingForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.shiprocket_shipment_id) {
      return res
        .status(404)
        .json({ message: "Order or Shiprocket shipment not found" });
    }
    const tracking = await getShiprocketTracking(order.shiprocket_shipment_id);
    res.json({ tracking });
  } catch (error) {
    console.error("Error fetching Shiprocket tracking:", error);
    res.status(500).json({
      message: "Failed to fetch Shiprocket tracking",
      error: error.message,
    });
  }
};

// Get Shiprocket label for an order
module.exports.getShiprocketLabelForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.shiprocket_shipment_id) {
      return res
        .status(404)
        .json({ message: "Order or Shiprocket shipment not found" });
    }
    const labelData = await getShiprocketLabel(order.shiprocket_shipment_id);
    res.json({ label_url: labelData.label_url });
  } catch (error) {
    console.error("Error fetching Shiprocket label:", error);
    res.status(500).json({
      message: "Failed to fetch Shiprocket label",
      error: error.message,
    });
  }
};

// Get all Shiprocket orders
module.exports.getAllShiprocketOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const shiprocketOrders = await getAllShiprocketOrders({
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(shiprocketOrders);
  } catch (error) {
    console.error("Error fetching Shiprocket orders:", error);
    res.status(500).json({
      message: "Failed to fetch Shiprocket orders",
      error: error.message,
    });
  }
};

// Sync existing orders with Shiprocket
// Cancel orders in Shiprocket (bulk)
module.exports.cancelOrdersInShiprocket = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Order IDs are required" });
    }

    const { cancelShiprocketOrder } = require("../services/shiprocketService");
    const results = {
      total: orderIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findByPk(orderId);
        if (!order || !order.shiprocket_order_id) {
          results.failed++;
          results.errors.push(`Order ${orderId}: No Shiprocket order ID found`);
          continue;
        }

        const cancelResult = await cancelShiprocketOrder(
          order.shiprocket_order_id
        );
        if (cancelResult.success) {
          results.successful++;
          console.log(`Order ${orderId} cancelled in Shiprocket successfully`);
        } else {
          results.failed++;
          results.errors.push(`Order ${orderId}: ${cancelResult.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Order ${orderId}: ${error.message}`);
      }
    }

    res.json({
      message: "Order cancellation sync completed",
      results,
    });
  } catch (error) {
    console.error("Error cancelling orders in Shiprocket:", error);
    res.status(500).json({
      message: "Failed to cancel orders in Shiprocket",
      error: error.message,
    });
  }
};

module.exports.syncOrdersWithShiprocket = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== SHIPROCKET SYNC PROCESS START ===");
    console.log("Request headers:", req.headers);
    console.log("Request user:", req.user);

    // First, test Shiprocket authentication
    try {
      console.log("=== TESTING SHIPROCKET AUTHENTICATION ===");
      await authenticateShiprocket();
      console.log("=== SHIPROCKET AUTHENTICATION SUCCESS ===");
    } catch (authError) {
      console.error("=== SHIPROCKET AUTHENTICATION FAILED ===");
      console.error("Auth error:", authError);
      await transaction.rollback();
      return res.status(400).json({
        message: "Shiprocket authentication failed",
        error: authError.message,
      });
    }

    // Get all orders that don't have Shiprocket IDs
    const unsyncedOrders = await Order.findAll({
      where: {
        [Op.or]: [
          { shiprocket_order_id: null },
          { shiprocket_shipment_id: null },
        ],
      },
      include: [
        { model: OrderItem, include: [Product] },
        { model: User, attributes: ["id", "username", "email"] },
        { model: ShippingAddress },
      ],
    });

    console.log(`Found ${unsyncedOrders.length} unsynced orders`);

    // Debug: Check all shipping addresses
    const allShippingAddresses = await ShippingAddress.findAll({
      limit: 5,
    });
    console.log(
      "Sample shipping addresses:",
      allShippingAddresses.map((addr) => ({
        id: addr.id,
        user_id: addr.user_id,
        address_line1: addr.address_line1,
        address_line2: addr.address_line2,
        city: addr.city,
        postal_code: addr.postal_code,
        state: addr.state,
        country: addr.country,
        phone: addr.phone,
      }))
    );

    const syncResults = {
      total: unsyncedOrders.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const order of unsyncedOrders) {
      try {
        // Check if order already has Shiprocket IDs
        if (order.shiprocket_order_id && order.shiprocket_shipment_id) {
          continue;
        }

        console.log(
          `Processing order ${order.order_number} for user ${order.user_id}:`
        );

        // Try multiple ways to get shipping address
        let shippingAddress = null;

        // First, try to get from the order's included data
        if (order.ShippingAddress) {
          shippingAddress = order.ShippingAddress;
          console.log("Found shipping address from order include");
        } else {
          // If not included, try to find by user_id
          shippingAddress = await ShippingAddress.findOne({
            where: { user_id: order.user_id },
          });
          console.log("Found shipping address by user_id query");
        }

        // If still not found, try to find any address for this user
        if (!shippingAddress) {
          const userAddresses = await ShippingAddress.findAll({
            where: { user_id: order.user_id },
          });
          if (userAddresses.length > 0) {
            shippingAddress = userAddresses[0];
            console.log("Found shipping address from user addresses list");
          }
        }

        console.log("Shipping address found:", !!shippingAddress);
        if (shippingAddress) {
          console.log("Address data:", {
            id: shippingAddress.id,
            user_id: shippingAddress.user_id,
            address: shippingAddress.address,
            city: shippingAddress.city,
            pincode: shippingAddress.pincode,
            state: shippingAddress.state,
            country: shippingAddress.country,
            phone: shippingAddress.phone,
          });
        }

        if (!shippingAddress) {
          syncResults.failed++;
          syncResults.errors.push(
            `Order ${order.order_number}: No shipping address found for user ${order.user_id}`
          );
          continue;
        }

        // Validate and prepare address data with fallbacks
        const billingAddress = shippingAddress.address || "Default Address";

        // Format phone number using the same function that works
        const formatPhoneNumber = (phone) => {
          if (!phone) return "9876543210";
          const digits = phone.toString().replace(/\D/g, "");

          if (digits.length === 12 && digits.startsWith("91")) {
            return digits.substring(2);
          }

          if (digits.length === 11 && digits.startsWith("0")) {
            return digits.substring(1);
          }

          if (digits.length === 10) {
            return digits;
          }

          if (digits.length < 10) {
            return "9876543210";
          }

          if (digits.length > 10) {
            return digits.slice(-10);
          }

          return "9876543210";
        };

        const billingPhone = formatPhoneNumber(shippingAddress.phone);

        const billingCity = shippingAddress.city || "Default City";
        const billingPincode = shippingAddress.pincode || "000000";
        const billingState = shippingAddress.state || "Default State";

        console.log("Processed address data:", {
          billingAddress,
          billingPhone,
          billingCity,
          billingPincode,
          billingState,
        });

        // Map order data to Shiprocket's required format
        const shiprocketOrderPayload = {
          order_id: String(order.order_number),
          order_date: order.createdAt
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
          pickup_location: "warehouse",
          channel_id: "7361105",
          comment: `Order from Cross-Coin: ${order.order_number}`,
          billing_customer_name: String(order.User.username),
          billing_last_name: "",
          billing_address: String(billingAddress),
          billing_address_2: "",
          billing_city: String(billingCity),
          billing_pincode: parseInt(billingPincode) || 400001,
          billing_state: String(billingState),
          billing_country: String(shippingAddress.country || "India"),
          billing_email: String(order.User.email),
          billing_phone: billingPhone,
          shipping_is_billing: true,
          shipping_customer_name: String(order.User.username),
          shipping_last_name: "",
          shipping_address: String(billingAddress),
          shipping_address_2: "",
          shipping_city: String(billingCity),
          shipping_pincode: parseInt(billingPincode) || 400001,
          shipping_state: String(billingState),
          shipping_country: String(shippingAddress.country || "India"),
          shipping_email: String(order.User.email),
          shipping_phone: billingPhone,
          order_items: order.OrderItems.map((item, index) => ({
            name: String(item.Product.name),
            sku:
              String(item.Product.sku || `PROD-${item.Product.id}`) +
              `-${item.id || index}`,
            units: parseInt(item.quantity),
            selling_price: parseFloat(item.price),
            discount: 0,
            tax: 0,
            hsn: 441122,
          })),
          payment_method: order.payment_type === "cod" ? "COD" : "Prepaid",
          shipping_charges: 0,
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: parseFloat(order.total_amount),
          length: 10,
          breadth: 15,
          height: 20,
          weight: 2.5,
        };

        console.log("=== SHIPROCKET ORDER SYNC DEBUG ===");
        console.log("Order:", order.order_number);
        console.log(
          "Full Shiprocket payload:",
          JSON.stringify(shiprocketOrderPayload, null, 2)
        );

        // Validate payload before sending
        const requiredFields = [
          "order_id",
          "order_date",
          "pickup_location",
          "billing_customer_name",
          "billing_address",
          "billing_city",
          "billing_pincode",
          "billing_state",
          "billing_country",
          "billing_email",
          "billing_phone",
          "order_items",
          "payment_method",
          "sub_total",
        ];

        const missingFields = requiredFields.filter(
          (field) => !shiprocketOrderPayload[field]
        );
        if (missingFields.length > 0) {
          console.error("❌ Missing required fields:", missingFields);
          syncResults.failed++;
          syncResults.errors.push(
            `Order ${
              order.order_number
            }: Missing required fields: ${missingFields.join(", ")}`
          );
          continue;
        }

        // Validate order_items
        if (
          !Array.isArray(shiprocketOrderPayload.order_items) ||
          shiprocketOrderPayload.order_items.length === 0
        ) {
          console.error(
            "❌ Invalid order_items:",
            shiprocketOrderPayload.order_items
          );
          syncResults.failed++;
          syncResults.errors.push(
            `Order ${order.order_number}: Invalid order_items`
          );
          continue;
        }

        console.log("✅ Payload validation passed");
        console.log("Sending to Shiprocket API...");

        const shiprocketResponse = await createShiprocketOrder(
          shiprocketOrderPayload
        );

        // Update order with Shiprocket IDs
        await order.update(
          {
            shiprocket_order_id: shiprocketResponse.order_id || null,
            shiprocket_shipment_id:
              (shiprocketResponse.shipments &&
                shiprocketResponse.shipments[0]?.shipment_id) ||
              null,
          },
          { transaction }
        );

        // Request pickup if shipment ID exists
        if (
          shiprocketResponse.shipments &&
          shiprocketResponse.shipments[0]?.shipment_id
        ) {
          try {
            await requestShiprocketPickup([
              shiprocketResponse.shipments[0].shipment_id,
            ]);
          } catch (pickupErr) {
            console.error(
              "Failed to request pickup for order",
              order.order_number,
              pickupErr
            );
          }
        }

        syncResults.successful++;
        console.log(
          `Successfully synced order ${order.order_number} with Shiprocket`
        );
      } catch (error) {
        syncResults.failed++;

        console.error("=== SHIPROCKET API ERROR ===");
        console.error("Order:", order.order_number);
        console.error("Error Status:", error.response?.status);
        console.error("Error Data:", error.response?.data);
        console.error("Error Message:", error.message);
        console.error("Full Error Object:", {
          name: error.name,
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
        });

        // Extract specific error details
        let errorMessage = error.message;
        if (error.response?.data) {
          if (typeof error.response.data === "object") {
            errorMessage = JSON.stringify(error.response.data);
          } else {
            errorMessage = error.response.data;
          }
        }

        syncResults.errors.push(`Order ${order.order_number}: ${errorMessage}`);
        console.error(
          `❌ Failed to sync order ${order.order_number}: ${errorMessage}`
        );
      }
    }

    await transaction.commit();
    console.log("=== SHIPROCKET SYNC PROCESS COMPLETED ===");
    console.log("Final results:", syncResults);

    res.json({
      message: "Order sync completed",
      results: syncResults,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("=== SHIPROCKET SYNC PROCESS FAILED ===");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    res.status(500).json({
      message: "Failed to sync orders with Shiprocket",
      error: error.message,
    });
  }
};

// Test Shiprocket credentials
module.exports.testShiprocketCredentials = async (req, res) => {
  try {
    await authenticateShiprocket();
    res.json({
      message: "Shiprocket credentials are valid",
      status: "success",
    });
  } catch (error) {
    res.status(400).json({
      message: "Shiprocket credentials are invalid",
      error: error.message,
      status: "error",
    });
  }
};
