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
// Import FShip service for shipping integration
const fshipService = require("../services/fshipService.js");
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
    return shippingFee ? Number(shippingFee.fee) : orderType === "cod" ? 5.99 : 0.0;
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

    // FShip integration - moved to background to avoid blocking order creation
    try {
      // Get shipping address separately
      const address = await ShippingAddress.findByPk(shipping_address_id);
      const user = createdOrder.User;

      // Validate address and phone
      if (!address || !address.address || !address.phone) {
        console.error(
          `Order ${createdOrder.order_number}: Missing address or phone, cannot sync to FShip.`
        );
      } else {
        const orderItems = createdOrder.OrderItems.map((item) => ({
          productName: item.Product.name,
          sku: item.ProductVariation?.sku || item.Product.sku || `PROD-${item.Product.id}`,
          quantity: item.quantity,
          unitPrice: item.price,
          productCategory: "Socks",
          hsnCode: "6115",
          taxRate: 0,
          productDiscount: 0
        }));

        const fshipOrderData = {
          customer_Name: String(user.username),
          customer_Mobile: String(address.phone),
          customer_Emailid: String(user.email),
          customer_Address: String(address.address),
          landMark: "",
          customer_Address_Type: "Home",
          customer_PinCode: String(address.pincode),
          customer_City: String(address.city || "Mumbai"),
          orderId: String(createdOrder.order_number),
          invoice_Number: String(createdOrder.order_number),
          payment_Mode: createdOrder.payment_type === "cod" ? 1 : 2, // 1=COD, 2=PREPAID
          express_Type: "surface",
          is_Ndd: 0,
          order_Amount: parseFloat(createdOrder.total_amount),
          tax_Amount: 0,
          extra_Charges: 0,
          total_Amount: parseFloat(createdOrder.final_amount),
          shipment_Weight: 0.5, // Default weight for socks
          shipment_Length: 25,
          shipment_Width: 15,
          shipment_Height: 5,
          pick_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
          return_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
          products: orderItems
        };

        // Run FShip integration in background
        setImmediate(async () => {
          try {
            console.log(`🔄 Creating FShip order for ${createdOrder.order_number}`);
            
            const fshipResponse = await fshipService.createForwardOrder(fshipOrderData);
            
            if (fshipResponse.success) {
              await createdOrder.update({
                fship_order_id: fshipResponse.orderId,
                fship_waybill: fshipResponse.waybill,
                fship_route_code: fshipResponse.routeCode,
                fship_label_url: fshipResponse.labelUrl,
                tracking_number: fshipResponse.waybill,
                status: "processing"
              });
              
              console.log("✅ FShip Order Created:", fshipResponse.orderId);
              
              // Register pickup automatically
              try {
                await fshipService.registerPickup([fshipResponse.waybill]);
                console.log("📦 FShip Pickup Registered:", fshipResponse.waybill);
              } catch (pickupError) {
                console.error("❌ Failed to register FShip pickup:", pickupError.message);
              }
            }
          } catch (err) {
            console.error("❌ Failed to create FShip order:", err.message);
          }
        });
      }
    } catch (err) {
      console.error("❌ Failed to prepare FShip order:", err.message);
    }

    console.log("createOrder: Sending success response...");
    res.status(201).json({
      message: "Order created successfully",
      order: createdOrder,
    });
    console.log("createOrder: Response sent successfully");

    // --- Auto-sync all unsynced orders with FShip in the background ---
    try {
      setImmediate(async () => {
        try {
          await module.exports.syncOrdersWithFShip(
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
          console.error("Background FShip sync failed:", err.message);
        }
      });
    } catch (err) {
      console.error(
        "Failed to trigger background FShip sync:",
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

    const finalAmount = Number(totalAmount) + Number(shippingFee) - Number(finalDiscountAmount);
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

    // Create FShip order automatically for guest orders
    setImmediate(async () => {
      try {
        console.log(
          "createGuestOrder: Creating FShip order for guest order:",
          order.order_number
        );

        const fshipOrderData = {
          customer_Name: `${guestUser.firstName} ${guestUser.lastName}`.trim(),
          customer_Mobile: String(guestShippingAddress.phone || guestUser.phone),
          customer_Emailid: String(guestUser.email),
          customer_Address: String(guestShippingAddress.address),
          landMark: "",
          customer_Address_Type: "Home",
          customer_PinCode: String(guestShippingAddress.pincode),
          customer_City: String(guestShippingAddress.city || "Mumbai"),
          orderId: String(order.order_number),
          invoice_Number: String(order.order_number),
          payment_Mode: payment_type === "cod" ? 1 : 2, // 1=COD, 2=PREPAID
          express_Type: "surface",
          is_Ndd: 0,
          order_Amount: parseFloat(totalAmount),
          tax_Amount: 0,
          extra_Charges: 0,
          total_Amount: parseFloat(finalAmount),
          shipment_Weight: 0.5, // Default weight for socks
          shipment_Length: 25,
          shipment_Width: 15,
          shipment_Height: 5,
          pick_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
          return_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
          products: validatedItems.map((item) => ({
            productName: item.product.name,
            sku: item.product.sku || `PROD-${item.product.id}`,
            quantity: item.quantity,
            unitPrice: item.price,
            productCategory: "Socks",
            hsnCode: "6115",
            taxRate: 0,
            productDiscount: 0
          }))
        };

        console.log(
          "createGuestOrder: FShip payload prepared:",
          fshipOrderData
        );

        const fshipResponse = await fshipService.createForwardOrder(fshipOrderData);

        if (fshipResponse.success) {
          await order.update({
            fship_order_id: fshipResponse.orderId,
            fship_waybill: fshipResponse.waybill,
            fship_route_code: fshipResponse.routeCode,
            fship_label_url: fshipResponse.labelUrl,
            tracking_number: fshipResponse.waybill,
            status: "processing"
          });

          console.log(
            "createGuestOrder: ✅ FShip Order Created for guest:",
            {
              order_number: order.order_number,
              fship_order_id: fshipResponse.orderId,
              waybill: fshipResponse.waybill,
            }
          );

          // Register pickup
          try {
            await fshipService.registerPickup([fshipResponse.waybill]);
            console.log(
              "createGuestOrder: ✅ FShip Pickup Requested:",
              fshipResponse.waybill
            );
          } catch (pickupError) {
            console.error(
              "createGuestOrder: ❌ Failed to request FShip pickup:",
              pickupError.message
            );
          }
        }
      } catch (fshipError) {
        console.error(
          "createGuestOrder: ❌ Failed to create FShip order for guest:",
          {
            order_number: order.order_number,
            error: fshipError.message,
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
                sku: item.ProductVariation.sku,
                price: item.ProductVariation.price,
                attributes: item.ProductVariation.attributes,
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
          attributes: ["id", "email", "username"],
          required: false,
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
          required: false,
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
              attributes: ["id", "sku", "price", "attributes"],
              required: false,
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: "OrderStatusHistories",
          order: [["created_at", "DESC"]],
          required: false,
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
                sku: item.ProductVariation.sku,
                price: item.ProductVariation.price,
                attributes: item.ProductVariation.attributes,
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

// Handle FShip webhook for order updates
module.exports.handleFShipWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("FShip Webhook received:", webhookData);

    const {
      waybill,
      status,
      courier_name,
      order_id,
    } = webhookData;

    if (!waybill && !order_id) {
      return res.status(400).json({ message: "Waybill or Order ID is required" });
    }

    // Find order by FShip waybill or order ID
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { fship_waybill: waybill },
          { fship_order_id: order_id },
          { order_number: order_id }
        ]
      },
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
      console.log("Order not found for FShip waybill/order ID:", waybill || order_id);
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order with FShip tracking information
    const updateData = {};
    if (waybill) updateData.tracking_number = waybill;
    if (courier_name) updateData.courier_name = courier_name;

    // Map FShip status to our order status
    let orderStatus = order.status;
    if (status) {
      orderStatus = fshipService.mapFShipStatusToCrossCoin(status);
      updateData.status = orderStatus;
    }

    if (Object.keys(updateData).length > 0) {
      await order.update(updateData);

      // Add status history entry
      await OrderStatusHistory.create({
        order_id: order.id,
        status: orderStatus,
        notes: `FShip webhook: ${status}${
          waybill ? ` - AWB: ${waybill}` : ""
        }${courier_name ? ` - Courier: ${courier_name}` : ""}`,
        created_by: "fship_webhook",
      });

      console.log("Order updated via FShip webhook:", {
        order_number: order.order_number,
        status: orderStatus,
        tracking_number: waybill,
        courier: courier_name,
      });
    }

    res.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing FShip webhook:", error);
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
      search, // Add search parameter
      sort = "createdAt",
      order = "DESC"
    } = req.query;

    console.log("=== GET ALL ORDERS DEBUG ===");
    console.log("Query parameters:", {
      status,
      payment_status,
      start_date,
      end_date,
      page,
      limit,
      search,
      sort,
      order
    });

    // Build filter based on query parameters
    const filter = {};
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Payment status filter
    if (payment_status && payment_status !== 'all') {
      filter.payment_status = payment_status;
    }

    // Date range filter
    if (start_date && end_date) {
      filter.createdAt = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
    }

    // Search functionality
    const searchConditions = [];
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Search in order number
      searchConditions.push({
        order_number: {
          [Op.like]: `%${searchTerm}%`
        }
      });
      
      // Search in final amount
      if (!isNaN(searchTerm)) {
        searchConditions.push({
          final_amount: {
            [Op.like]: `%${searchTerm}%`
          }
        });
      }
      
      // Search in tracking number
      searchConditions.push({
        tracking_number: {
          [Op.like]: `%${searchTerm}%`
        }
      });
      
      // Search in courier name
      searchConditions.push({
        courier_name: {
          [Op.like]: `%${searchTerm}%`
        }
      });
    }

    // Pagination
    const offset = (page - 1) * limit;

    // Build order clause
    const orderClause = [[sort, order.toUpperCase()]];

    // Build the main query
    const queryOptions = {
      where: filter,
      distinct: true,
      col: "id",
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "username", "email"],
          required: false,
          ...(search && search.trim() ? {
            where: {
              [Op.or]: [
                {
                  username: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  email: {
                    [Op.like]: `%${search.trim()}%`
                  }
                }
              ]
            }
          } : {})
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
          required: false,
          ...(search && search.trim() ? {
            where: {
              [Op.or]: [
                {
                  email: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  firstName: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  lastName: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  phone: {
                    [Op.like]: `%${search.trim()}%`
                  }
                }
              ]
            }
          } : {})
        },
        {
          model: ShippingAddress,
          as: "ShippingAddress",
          attributes: [
            "id",
            "full_name",
            "phone",
            "address",
            "city",
            "state",
            "pincode",
            "country",
          ],
          required: false,
          ...(search && search.trim() ? {
            where: {
              [Op.or]: [
                {
                  full_name: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  phone: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  address: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  city: {
                    [Op.like]: `%${search.trim()}%`
                  }
                },
                {
                  pincode: {
                    [Op.like]: `%${search.trim()}%`
                  }
                }
              ]
            }
          } : {})
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
            {
              model: ProductVariation,
              as: "ProductVariation",
              attributes: ["id", "sku", "price", "attributes"],
              include: [
                {
                  model: ProductImage,
                  as: "VariationImages",
                  attributes: ["id", "image_url", "alt_text", "is_primary"]
                }
              ],
              required: false,
            },
          ],
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    // Add search conditions to main where clause if any
    if (searchConditions.length > 0) {
      if (Object.keys(filter).length > 0) {
        queryOptions.where = {
          [Op.and]: [
            filter,
            {
              [Op.or]: searchConditions
            }
          ]
        };
      } else {
        queryOptions.where = {
          [Op.or]: searchConditions
        };
      }
    }

    const orders = await Order.findAndCountAll(queryOptions);

    const totalPages = Math.ceil(orders.count / limit);

    console.log("Query results:", {
      totalCount: orders.count,
      returnedRows: orders.rows.length,
      limit: parseInt(limit),
      page: parseInt(page),
      totalPages,
      searchTerm: search || 'none',
      filtersApplied: {
        status: status || 'all',
        payment_status: payment_status || 'all',
        hasDateRange: !!(start_date && end_date)
      }
    });

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
      filters: {
        status: status || 'all',
        payment_status: payment_status || 'all',
        search: search || '',
        sort,
        order
      }
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
          as: "OrderItems",
          include: [
            {
              model: Product,
              as: "Product",
              include: [{ model: ProductImage, as: "ProductImages" }],
            },
            {
              model: ProductVariation,
              as: "ProductVariation",
              attributes: ["id", "sku", "price", "attributes"],
              include: [
                {
                  model: ProductImage,
                  as: "VariationImages",
                  attributes: ["id", "image_url", "alt_text", "is_primary"]
                }
              ],
              required: false,
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
      include: [
        {
          model: OrderItem,
          as: "OrderItems",
          include: [
            {
              model: Product,
              as: "Product",
              include: [{ model: ProductImage, as: "ProductImages" }],
            },
            {
              model: ProductVariation,
              as: "ProductVariation",
              attributes: ["id", "sku", "price", "attributes"],
              include: [
                {
                  model: ProductImage,
                  as: "VariationImages",
                  attributes: ["id", "image_url", "alt_text", "is_primary"]
                }
              ],
              required: false,
            },
          ],
        },
        {
          model: User,
          as: "User",
          attributes: ["id", "username", "email"],
          required: false,
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
          required: false,
        },
        {
          model: ShippingAddress,
          as: "ShippingAddress",
          attributes: [
            "id",
            "full_name",
            "phone",
            "address",
            "city",
            "state",
            "pincode",
            "country",
          ],
          required: false,
        },
      ],
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

// Update order status - DEPRECATED: Use FShip sync instead
module.exports.updateOrderStatus = async (req, res) => {
  try {
    // Manual status updates are now disabled to maintain FShip sync integrity
    return res.status(400).json({
      success: false,
      message: "Manual status updates are disabled. Order statuses are automatically synchronized with FShip.",
      recommendation: "Use the comprehensive FShip sync feature to update order statuses automatically.",
      endpoint: "POST /api/orders/fship/sync"
    });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to process status update request", 
      error: error.message 
    });
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

    // Cancel order in FShip if it exists
    if (order.fship_waybill) {
      try {
        const cancelRes = await fshipService.cancelOrder(
          order.fship_waybill,
          reason || "Order cancelled by customer"
        );
        console.log("FShip order cancelled successfully:", cancelRes);
      } catch (err) {
        console.error(
          "Failed to cancel FShip order:",
          err.message
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
    
    // Calculate total revenue excluding cancelled orders
    const totalRevenue = await Order.sum("final_amount", {
      where: {
        status: {
          [Op.ne]: 'cancelled'
        }
      }
    });
    
    const totalPendingOrders = await Order.count({
      where: { status: "pending" },
    });
    const totalProcessingOrders = await Order.count({
      where: { status: "processing" },
    });
    const totalShippedOrders = await Order.count({
      where: { status: "shipped" },
    });
    const totalDeliveredOrders = await Order.count({
      where: { status: "delivered" },
    });
    const totalCancelledOrders = await Order.count({
      where: { status: "cancelled" },
    });

    // Calculate average order value (excluding cancelled orders)
    const nonCancelledOrdersCount = totalOrders - totalCancelledOrders;
    const averageOrderValue = nonCancelledOrdersCount > 0 ? (totalRevenue || 0) / nonCancelledOrdersCount : 0;

    res.json({
      totalOrders,
      totalRevenue: totalRevenue || 0,
      averageOrderValue,
      totalPendingOrders,
      totalProcessingOrders,
      totalShippedOrders,
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

// Get FShip tracking info for an order
module.exports.getFShipTrackingForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.fship_waybill) {
      return res
        .status(404)
        .json({ message: "Order or FShip waybill not found" });
    }
    const tracking = await fshipService.getShipmentStatus(order.fship_waybill);
    res.json({ tracking });
  } catch (error) {
    console.error("Error fetching FShip tracking:", error);
    res.status(500).json({
      message: "Failed to fetch FShip tracking",
      error: error.message,
    });
  }
};

// Get FShip label for an order
module.exports.getFShipLabelForOrder = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await Order.findByPk(id);
    if (!order || !order.fship_waybill) {
      return res
        .status(404)
        .json({ message: "Order or FShip waybill not found" });
    }
    const labelData = await fshipService.getShippingLabel(order.fship_waybill);
    res.json({ label_data: labelData });
  } catch (error) {
    console.error("Error fetching FShip label:", error);
    res.status(500).json({
      message: "Failed to fetch FShip label",
      error: error.message,
    });
  }
};

// Get FShip courier list
module.exports.getFShipCouriers = async (req, res) => {
  try {
    const couriers = await fshipService.getCourierList();
    res.json({ couriers });
  } catch (error) {
    console.error("Error fetching FShip couriers:", error);
    res.status(500).json({
      message: "Failed to fetch FShip couriers",
      error: error.message,
    });
  }
};

// Cancel orders in FShip (bulk)
module.exports.cancelOrdersInFShip = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Order IDs are required" });
    }

    const results = {
      total: orderIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findByPk(orderId);
        if (!order || !order.fship_waybill) {
          results.failed++;
          results.errors.push(`Order ${orderId}: No FShip waybill found`);
          continue;
        }

        const cancelResult = await fshipService.cancelOrder(
          order.fship_waybill,
          "Bulk cancellation"
        );
        
        results.successful++;
        console.log(`Order ${orderId} cancelled in FShip successfully`);
        
        // Update local order status
        await order.update({ status: "cancelled" });
        
        // Add status history
        await OrderStatusHistory.create({
          order_id: order.id,
          status: "cancelled",
          notes: "Cancelled via FShip bulk operation",
          created_by: "admin",
        });
        
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
    console.error("Error cancelling orders in FShip:", error);
    res.status(500).json({
      message: "Failed to cancel orders in FShip",
      error: error.message,
    });
  }
};

// Enhanced sync functions with comprehensive order management
module.exports.syncOrdersWithFShip = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== ENHANCED FSHIP SYNC PROCESS START ===");
    console.log("Flow: Check sync status → Create if needed → Update status → Handle COD payments");

    // STEP 1: Test FShip connection
    try {
      console.log("=== STEP 1: TESTING FSHIP CONNECTION ===");
      const testResult = await fshipService.testConnection();
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      console.log("✅ FSHIP CONNECTION SUCCESS");
    } catch (authError) {
      console.error("❌ FSHIP CONNECTION FAILED");
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "FShip connection failed",
        error: authError.message,
        step: "connection"
      });
    }

    // STEP 2: Get orders for sync (exclude cancelled and delivered)
    console.log("=== STEP 2: FETCHING ORDERS FOR SYNC ===");
    
    const ordersToSync = await Order.findAll({
      where: {
        status: { [Op.notIn]: ['cancelled', 'delivered'] }, // Skip final states
        order_number: { [Op.notLike]: '%TEST%' } // Exclude test orders
      },
      include: [
        { model: OrderItem, as: "OrderItems", include: [{ model: Product, as: "Product" }] },
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName", "phone"], required: false },
        { model: ShippingAddress, as: "ShippingAddress" },
      ],
      limit: 50, // Process in batches
      order: [['created_at', 'DESC']]
    });

    console.log(`📦 Found ${ordersToSync.length} orders to process`);

    const results = {
      total: ordersToSync.length,
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [],
      errors_list: []
    };

    // STEP 3: Process each order with enhanced sync logic
    for (const order of ordersToSync) {
      try {
        console.log(`\n🔄 Processing order: ${order.order_number} (Status: ${order.status})`);
        
        const syncResult = await this.enhancedSyncSingleOrder(order, transaction);
        
        if (syncResult.success) {
          if (syncResult.action === 'synced') {
            results.synced++;
          } else if (syncResult.action === 'updated') {
            results.updated++;
          } else {
            results.skipped++;
          }
          
          results.details.push({
            order_number: order.order_number,
            action: syncResult.action,
            status: syncResult.status,
            fship_order_id: syncResult.fship_order_id,
            waybill: syncResult.waybill,
            message: syncResult.message
          });
        } else {
          results.errors++;
          results.errors_list.push({
            order_number: order.order_number,
            error: syncResult.error
          });
        }
        
      } catch (error) {
        console.error(`❌ Error processing order ${order.order_number}:`, error.message);
        results.errors++;
        results.errors_list.push({
          order_number: order.order_number,
          error: error.message
        });
      }
    }

    await transaction.commit();

    console.log("\n=== SYNC SUMMARY ===");
    console.log(`📦 Total: ${results.total}`);
    console.log(`✅ Synced: ${results.synced}`);
    console.log(`🔄 Updated: ${results.updated}`);
    console.log(`⏭️ Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);

    return res.json({
      success: true,
      message: "Enhanced FShip sync completed",
      data: results
    });

  } catch (error) {
    console.error("❌ SYNC PROCESS FAILED:", error);
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: "Sync process failed",
      error: error.message
    });
  }
};

// Enhanced single order sync with comprehensive logic
module.exports.enhancedSyncSingleOrder = async (order, transaction = null) => {
  const localTransaction = transaction || await sequelize.transaction();
  const shouldCommit = !transaction;

  try {
    console.log(`🔍 Enhanced sync for order: ${order.order_number}`);

    // STEP 1: Check if order is already synced
    const isSynced = order.fship_order_id && order.fship_waybill;
    
    if (!isSynced) {
      // STEP 2: Order not synced - Create in FShip
      console.log(`📝 Order ${order.order_number} not synced. Creating in FShip...`);
      
      const createResult = await this.createOrderInFShip(order, localTransaction);
      
      if (createResult.success) {
        console.log(`✅ Order ${order.order_number} created in FShip`);
        
        if (shouldCommit) await localTransaction.commit();
        
        return {
          success: true,
          action: 'synced',
          status: order.status,
          fship_order_id: createResult.fship_order_id,
          waybill: createResult.waybill,
          message: 'Order created and synced with FShip'
        };
      } else {
        throw new Error(createResult.error);
      }
    } else {
      // STEP 3: Order already synced - Update status
      console.log(`🔄 Order ${order.order_number} already synced. Checking for updates...`);
      
      const updateResult = await this.updateOrderStatusFromFShip(order, localTransaction);
      
      if (updateResult.success) {
        console.log(`✅ Order ${order.order_number} status updated`);
        
        if (shouldCommit) await localTransaction.commit();
        
        return {
          success: true,
          action: updateResult.statusChanged ? 'updated' : 'skipped',
          status: updateResult.newStatus || order.status,
          fship_order_id: order.fship_order_id,
          waybill: order.fship_waybill,
          message: updateResult.message
        };
      } else {
        throw new Error(updateResult.error);
      }
    }

  } catch (error) {
    console.error(`❌ Enhanced sync failed for ${order.order_number}:`, error.message);
    if (shouldCommit) await localTransaction.rollback();
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Create order in FShip
module.exports.createOrderInFShip = async (order, transaction) => {
  try {
    console.log(`🚀 Creating order ${order.order_number} in FShip...`);

    // Prepare order data for FShip
    const fshipOrderData = await this.prepareFShipOrderData(order);
    
    // Create order using enhanced FShip service
    const result = await fshipService.createOrUpdateForwardOrder(fshipOrderData);
    
    if (result.success) {
      // Update order with FShip details
      await order.update({
        fship_order_id: result.orderId,
        fship_waybill: result.waybill,
        fship_route_code: result.routeCode,
        tracking_number: result.waybill,
        status: 'processing' // Update status to processing when synced
      }, { transaction });

      // Create status history
      await OrderStatusHistory.create({
        order_id: order.id,
        status: 'processing',
        notes: `Order synced with FShip. AWB: ${result.waybill}`,
        created_by: 'fship_sync_system'
      }, { transaction });

      console.log(`✅ Order ${order.order_number} created in FShip with AWB: ${result.waybill}`);
      
      return {
        success: true,
        fship_order_id: result.orderId,
        waybill: result.waybill,
        route_code: result.routeCode
      };
    } else {
      throw new Error(result.message || 'Failed to create order in FShip');
    }

  } catch (error) {
    console.error(`❌ Failed to create order ${order.order_number} in FShip:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update order status from FShip
module.exports.updateOrderStatusFromFShip = async (order, transaction) => {
  try {
    console.log(`🔄 Updating status for order ${order.order_number} from FShip...`);

    const waybill = order.fship_waybill || order.tracking_number;
    
    if (!waybill) {
      return {
        success: false,
        error: 'No waybill found for order'
      };
    }

    // Get tracking history from FShip
    const trackingResult = await fshipService.getTrackingHistory(waybill);
    
    if (trackingResult && trackingResult.summary) {
      const fshipStatus = trackingResult.summary.status;
      const newStatus = fshipService.mapFShipStatusToCrossCoin(fshipStatus);
      
      console.log(`📊 FShip status: "${fshipStatus}" → CrossCoin status: "${newStatus}"`);
      
      const statusChanged = order.status !== newStatus;
      
      if (statusChanged) {
        // Update order status
        await order.update({
          status: newStatus
        }, { transaction });

        // Create status history
        await OrderStatusHistory.create({
          order_id: order.id,
          status: newStatus,
          notes: `Status updated from FShip. FShip status: ${fshipStatus}`,
          created_by: 'fship_sync_system'
        }, { transaction });

        // SPECIAL HANDLING: If order is delivered and COD, mark payment as paid
        if (newStatus === 'delivered' && order.payment_type === 'cod') {
          console.log(`💰 Order ${order.order_number} is delivered COD. Updating payment status to paid...`);
          
          await order.update({
            payment_status: 'paid'
          }, { transaction });

          // Create payment record if not exists
          const existingPayment = await Payment.findOne({
            where: { order_id: order.id }
          });

          if (!existingPayment) {
            await Payment.create({
              order_id: order.id,
              payment_method: 'cod',
              amount: order.final_amount,
              status: 'completed',
              transaction_id: `COD-${order.order_number}`,
              payment_date: new Date(),
              notes: 'COD payment completed on delivery'
            }, { transaction });
          } else {
            await existingPayment.update({
              status: 'completed',
              payment_date: new Date(),
              notes: 'COD payment completed on delivery'
            }, { transaction });
          }

          console.log(`✅ Payment status updated to paid for COD order ${order.order_number}`);
          console.log(`✅ Payment status updated to paid for COD order ${order.order_number}`);
        }

        console.log(`✅ Order ${order.order_number} status updated: ${order.status} → ${newStatus}`);
        
        return {
          success: true,
          statusChanged: true,
          newStatus: newStatus,
          message: `Status updated from ${order.status} to ${newStatus}`
        };
      } else {
        console.log(`📋 Order ${order.order_number} status unchanged: ${order.status}`);
        
        return {
          success: true,
          statusChanged: false,
          message: 'Status unchanged'
        };
      }
    } else {
      return {
        success: false,
        error: 'No tracking data found in FShip'
      };
    }

  } catch (error) {
    console.error(`❌ Failed to update status for order ${order.order_number}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Prepare order data for FShip API
module.exports.prepareFShipOrderData = async (order) => {
  try {
    // Get customer details
    const customer = order.User || order.GuestUser;
    const customerName = customer 
      ? (customer.firstName && customer.lastName 
          ? `${customer.firstName} ${customer.lastName}` 
          : customer.username || customer.email)
      : 'Customer';

    const customerMobile = customer?.phone || order.ShippingAddress?.phone || '9876543210';
    const customerEmail = customer?.email || '';

    // Prepare products array
    const products = order.OrderItems.map(item => ({
      productId: item.Product?.id || '',
      productName: item.Product?.name || 'Product',
      unitPrice: parseFloat(item.price) || 0,
      quantity: item.quantity || 1,
      productCategory: 'Socks',
      sku: item.Product?.sku || '',
      hsnCode: item.Product?.hsn_code || '',
      taxRate: 0,
      productDiscount: 0
    }));

    // Prepare FShip order data
    const fshipOrderData = {
      orderId: order.order_number,
      customer_Name: customerName,
      customer_Mobile: customerMobile,
      customer_Emailid: customerEmail,
      customer_Address: order.ShippingAddress?.address_line_1 || 'Address not provided',
      landMark: order.ShippingAddress?.address_line_2 || '',
      customer_Address_Type: 'Home',
      customer_PinCode: order.ShippingAddress?.postal_code || '400001',
      customer_City: order.ShippingAddress?.city || 'Mumbai',
      payment_Mode: order.payment_type === 'cod' ? 1 : 2, // 1=COD, 2=PREPAID
      express_Type: 'surface',
      is_Ndd: 0,
      order_Amount: parseFloat(order.total_amount) || 0,
      tax_Amount: 0,
      extra_Charges: parseFloat(order.shipping_fee) || 0,
      total_Amount: parseFloat(order.final_amount) || 0,
      shipment_Weight: 0.5, // Default weight
      shipment_Length: 20,
      shipment_Width: 15,
      shipment_Height: 10,
      latitude: 0,
      longitude: 0,
      pick_Address_ID: process.env.FSHIP_DEFAULT_WAREHOUSE_ID || 227729,
      return_Address_ID: process.env.FSHIP_DEFAULT_WAREHOUSE_ID || 227729,
      products: products,
      courierId: 0 // Auto-selection
    };

    return fshipOrderData;

  } catch (error) {
    console.error('Error preparing FShip order data:', error);
    throw error;
  }
};

// Enhanced single order sync endpoint
module.exports.syncSingleOrderWithFShip = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    
    console.log(`=== ENHANCED SINGLE ORDER SYNC: ${id} ===`);
    
    // Find the order
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: "OrderItems", include: [{ model: Product, as: "Product" }] },
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName", "phone"], required: false },
        { model: ShippingAddress, as: "ShippingAddress" },
      ]
    });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    console.log(`Found order: ${order.order_number} - Status: ${order.status}`);
    
    // Skip sync for cancelled orders (but allow delivered for status updates)
    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.json({
        success: true,
        message: `Order ${order.order_number} is cancelled. No sync needed.`,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            action: 'skipped'
          }
        }
      });
    }
    
    // Test FShip connection
    try {
      const testResult = await fshipService.testConnection();
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      console.log("✅ FShip connection successful");
    } catch (authError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "FShip connection failed",
        error: authError.message
      });
    }
    
    // Use enhanced sync logic
    const syncResult = await this.enhancedSyncSingleOrder(order, transaction);
    
    if (syncResult.success) {
      await transaction.commit();
      
      return res.json({
        success: true,
        message: `Order ${order.order_number} sync completed`,
        data: {
          order: {
            id: order.id,
            order_number: order.order_number,
            status: syncResult.status,
            fship_order_id: syncResult.fship_order_id,
            waybill: syncResult.waybill,
            action: syncResult.action
          },
          result: syncResult
        }
      });
    } else {
      await transaction.rollback();
      
      return res.status(400).json({
        success: false,
        message: `Failed to sync order ${order.order_number}`,
        error: syncResult.error
      });
    }

  } catch (error) {
    console.error("❌ SINGLE ORDER SYNC FAILED:", error);
    await transaction.rollback();
    
    return res.status(500).json({
      success: false,
      message: "Single order sync failed",
      error: error.message
    });
  }
};

// Admin cancel order (by admin)
module.exports.adminCancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const adminId = req.user.id;

    const order = await Order.findByPk(orderId);
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        message: "Order not found" 
      });
    }

    // Cannot cancel if already delivered or cancelled
    if (order.status === "delivered" || order.status === "cancelled") {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: `Cannot cancel ${order.status} orders` 
      });
    }

    // Update order status
    order.status = "cancelled";
    await order.save({ transaction });

    // Create status history entry with admin's reason
    await OrderStatusHistory.create(
      {
        order_id: order.id,
        status: "cancelled",
        updated_by: adminId,
        notes: `Admin cancelled: ${reason || 'No reason provided'}`,
        created_by: "admin"
      },
      { transaction }
    );

    // If payment is 'paid', mark for refund
    if (order.payment_status === "paid") {
      const payment = await Payment.findOne({
        where: { order_id: order.id, status: "completed" },
      });

      if (payment) {
        payment.status = "refunded";
        await payment.save({ transaction });

        order.payment_status = "refunded";
        await order.save({ transaction });
      }
    }

    // Cancel order in FShip if it exists
    if (order.fship_waybill) {
      try {
        const cancelRes = await fshipService.cancelOrder(
          order.fship_waybill,
          reason || "Order cancelled by admin"
        );
        console.log("FShip order cancelled successfully:", cancelRes);
      } catch (err) {
        console.error(
          "Failed to cancel FShip order:",
          err.message
        );
        // Don't fail the entire operation if FShip cancel fails
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Order cancelled successfully by admin",
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error cancelling order (admin):", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to cancel order", 
      error: error.message 
    });
  }
};
// Track order by order number (works for both registered and guest orders)
module.exports.trackOrderByOrderNumber = async (req, res) => {
  try {
    const { order_number } = req.params;

    if (!order_number) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    console.log(`Tracking order by order number: ${order_number}`);

    // Find order by order number
    const order = await Order.findOne({
      where: { order_number: order_number },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "email", "username"],
          required: false,
        },
        {
          model: GuestUser,
          as: "GuestUser",
          attributes: ["id", "email", "firstName", "lastName", "phone"],
          required: false,
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
              attributes: ["id", "sku", "price", "attributes"],
              required: false,
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: "OrderStatusHistories",
          order: [["created_at", "DESC"]],
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found with this order number",
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
          fship_waybill: order.fship_waybill,
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
                sku: item.ProductVariation.sku,
                price: item.ProductVariation.price,
                attributes: item.ProductVariation.attributes,
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
    console.error("Error tracking order by order number:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track order",
      error: error.message,
    });
  }
};