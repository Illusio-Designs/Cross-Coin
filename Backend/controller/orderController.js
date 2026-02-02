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
// Import FShip service instead of Shiprocket
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

module.exports.syncOrdersWithFShip = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("=== COMPREHENSIVE FSHIP SYNC PROCESS START ===");
    console.log("This will: 1) Test connection 2) Sync new orders 3) Update existing order statuses");

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
      console.error("Connection error:", authError);
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "FShip connection failed",
        error: authError.message,
        step: "connection"
      });
    }

    // STEP 2: Get all orders for comprehensive sync
    console.log("=== STEP 2: FETCHING ORDERS FOR SYNC ===");
    
    // Get orders that need initial sync (no FShip IDs)
    const unsyncedOrders = await Order.findAll({
      where: {
        [Op.or]: [
          { fship_order_id: null },
          { fship_waybill: null },
        ],
        status: { [Op.notIn]: ['cancelled', 'delivered'] }, // Don't sync completed orders
        order_number: { [Op.notLike]: '%TEST%' } // Exclude test orders
      },
      include: [
        { model: OrderItem, as: "OrderItems", include: [{ model: Product, as: "Product" }] },
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName", "phone"], required: false },
        { model: ShippingAddress, as: "ShippingAddress" },
      ],
      limit: 25 // Limit to prevent timeout
    });

    // Get orders that need status updates (already have FShip IDs)
    const ordersForStatusUpdate = await Order.findAll({
      where: {
        [Op.or]: [
          { fship_waybill: { [Op.not]: null } },
          { fship_order_id: { [Op.not]: null } }
        ],
        status: { [Op.in]: ['pending', 'processing', 'shipped'] }, // Only non-final statuses
        order_number: { [Op.notLike]: '%TEST%' } // Exclude test orders
      },
      limit: 25 // Limit to prevent timeout
    });

    console.log(`Found ${unsyncedOrders.length} orders to sync with FShip`);
    console.log(`Found ${ordersForStatusUpdate.length} orders to update status from FShip`);

    const syncResults = {
      total_orders_processed: unsyncedOrders.length + ordersForStatusUpdate.length,
      new_orders_synced: 0,
      existing_orders_updated: 0,
      status_updates: 0,
      tracking_updates: 0,
      failed: 0,
      errors: [],
      steps_completed: []
    };

    syncResults.steps_completed.push("✅ Connection test successful");
    syncResults.steps_completed.push(`📊 Found ${unsyncedOrders.length} new orders and ${ordersForStatusUpdate.length} existing orders`);

    // STEP 3: Sync new orders with FShip
    if (unsyncedOrders.length > 0) {
      console.log("=== STEP 3: SYNCING NEW ORDERS WITH FSHIP ===");
      
      for (const order of unsyncedOrders) {
        try {
          console.log(`🔄 Processing new order ${order.order_number}`);

          // Get shipping address
          let shippingAddress = order.ShippingAddress;
          if (!shippingAddress) {
            if (order.user_id) {
              shippingAddress = await ShippingAddress.findOne({
                where: { user_id: order.user_id },
              });
            } else if (order.guest_user_id) {
              shippingAddress = await ShippingAddress.findOne({
                where: { guest_user_id: order.guest_user_id },
              });
            }
          }

          if (!shippingAddress) {
            syncResults.failed++;
            syncResults.errors.push(`Order ${order.order_number}: No shipping address found`);
            console.error(`❌ No shipping address found for order ${order.order_number}`);
            continue;
          }

          // Get customer information
          const isGuestOrder = !order.User && order.GuestUser;
          const customerName = isGuestOrder 
            ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}`.trim() 
            : (order.User?.username || "Customer");
          const customerEmail = isGuestOrder 
            ? order.GuestUser.email 
            : (order.User?.email || "customer@example.com");

          // Prepare FShip order data
          const fshipOrderData = {
            customer_Name: customerName,
            customer_Mobile: fshipService.formatPhoneNumber(shippingAddress.phone),
            customer_Emailid: customerEmail,
            customer_Address: shippingAddress.address,
            landMark: "",
            customer_Address_Type: "Home",
            customer_PinCode: shippingAddress.pincode,
            customer_City: shippingAddress.city || "Mumbai",
            orderId: order.order_number,
            invoice_Number: order.order_number,
            payment_Mode: order.payment_type === "cod" ? 1 : 2, // 1=COD, 2=PREPAID
            express_Type: "surface",
            is_Ndd: 0,
            order_Amount: parseFloat(order.total_amount),
            tax_Amount: 0,
            extra_Charges: 0,
            total_Amount: parseFloat(order.final_amount),
            shipment_Weight: 0.5, // Default weight for socks
            shipment_Length: 25,
            shipment_Width: 15,
            shipment_Height: 5,
            pick_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
            return_Address_ID: parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID) || 12191,
            products: order.OrderItems.map((item) => ({
              productName: item.Product.name,
              sku: item.Product.sku || `PROD-${item.Product.id}`,
              quantity: item.quantity,
              unitPrice: item.price,
              productCategory: "Socks",
              hsnCode: "6115",
              taxRate: 0,
              productDiscount: 0
            }))
          };

          // Check if order already exists in FShip before creating
          try {
            console.log(`🔍 Checking if order ${order.order_number} already exists in FShip...`);
            const existsCheck = await fshipService.checkOrderExists(order.order_number);
            
            if (existsCheck.exists) {
              console.log(`⚠️ Order ${order.order_number} already exists in FShip, updating local data`);
              
              // Update our local order with existing FShip data
              const updateData = {};
              
              if (existsCheck.data?.apiorderid) {
                updateData.fship_order_id = existsCheck.data.apiorderid;
              }
              
              if (existsCheck.data?.waybill) {
                updateData.fship_waybill = existsCheck.data.waybill;
                updateData.tracking_number = existsCheck.data.waybill;
              }
              
              if (existsCheck.data?.route_code) {
                updateData.fship_route_code = existsCheck.data.route_code;
              }
              
              if (existsCheck.data?.order_status) {
                const newStatus = fshipService.mapFShipStatusToCrossCoin(existsCheck.data.order_status);
                if (newStatus !== order.status) {
                  updateData.status = newStatus;
                }
              }
              
              if (Object.keys(updateData).length > 0) {
                await order.update(updateData, { transaction });
              }
              
              syncResults.new_orders_synced++;
              console.log(`✅ Updated existing FShip order ${order.order_number}`);
              continue; // Skip creating new order
            }
          } catch (checkError) {
            console.error(`⚠️ Could not verify if order ${order.order_number} exists: ${checkError.message}`);
            console.log("Proceeding with order creation anyway...");
          }

          console.log(`📦 Creating FShip order for ${order.order_number}`);
          const fshipResponse = await fshipService.createForwardOrder(fshipOrderData);

          if (fshipResponse.success) {
            // Update order with FShip data
            await order.update({
              fship_order_id: fshipResponse.orderId,
              fship_waybill: fshipResponse.waybill,
              fship_route_code: fshipResponse.routeCode,
              tracking_number: fshipResponse.waybill,
              status: "processing"
            }, { transaction });

            syncResults.new_orders_synced++;
            console.log(`✅ Successfully synced order ${order.order_number} with FShip`);

            // Register pickup
            try {
              await fshipService.registerPickup([fshipResponse.waybill]);
              console.log(`📦 Pickup registered for order ${order.order_number}`);
            } catch (pickupErr) {
              console.error(`Failed to register pickup for order ${order.order_number}:`, pickupErr.message);
            }
          }
        } catch (error) {
          syncResults.failed++;
          console.error(`❌ Failed to sync order ${order.order_number}:`, error.message);
          syncResults.errors.push(`Order ${order.order_number}: ${error.message}`);
        }
      }

      syncResults.steps_completed.push(`✅ New order sync completed: ${syncResults.new_orders_synced} created`);
    }

    // STEP 4: Update status for existing orders using individual tracking
    if (ordersForStatusUpdate.length > 0) {
      console.log("=== STEP 4: UPDATING STATUS FOR EXISTING ORDERS ===");
      
      for (const order of ordersForStatusUpdate) {
        try {
          console.log(`🔄 Updating order ${order.order_number} (Waybill: ${order.fship_waybill})`);
          
          if (!order.fship_waybill) {
            console.log(`⚠️  Order ${order.order_number} has no waybill, skipping status update`);
            continue;
          }
          
          // Get detailed shipment status for this specific order
          const shipmentStatus = await fshipService.getShipmentStatus(order.fship_waybill);
          
          if (shipmentStatus && shipmentStatus.data) {
            const fshipData = shipmentStatus.data;
            let hasUpdates = false;
            
            // Prepare update data
            const updateData = {};
            
            // Update status if different
            const newStatus = fshipService.mapFShipStatusToCrossCoin(fshipData.status || fshipData.order_status);
            if (newStatus !== order.status) {
              updateData.status = newStatus;
              hasUpdates = true;
              syncResults.status_updates++;
              console.log(`📈 Status will be updated for order ${order.order_number}: ${order.status} → ${newStatus}`);
            }
            
            // Update courier information
            if (fshipData.courier_name && fshipData.courier_name !== order.courier_name) {
              updateData.courier_name = fshipData.courier_name;
              hasUpdates = true;
            }
            
            // Update tracking URL if available
            if (fshipData.tracking_url && fshipData.tracking_url !== order.tracking_url) {
              updateData.tracking_url = fshipData.tracking_url;
              hasUpdates = true;
            }
            
            // Update last scan information
            if (fshipData.last_scan_date) {
              updateData.last_scan_date = fshipData.last_scan_date;
              hasUpdates = true;
            }
            
            if (fshipData.last_location) {
              updateData.last_location = fshipData.last_location;
              hasUpdates = true;
            }
            
            if (fshipData.last_remarks) {
              updateData.last_remarks = fshipData.last_remarks;
              hasUpdates = true;
            }
            
            // Apply updates if any
            if (hasUpdates) {
              await order.update(updateData, { transaction });
              
              // Add status history if status changed
              if (updateData.status) {
                await OrderStatusHistory.create({
                  order_id: order.id,
                  status: updateData.status,
                  notes: `FShip sync: ${fshipData.status || fshipData.order_status}${fshipData.last_remarks ? ` - ${fshipData.last_remarks}` : ''}`,
                  created_by: "fship_sync",
                }, { transaction });
              }
              
              syncResults.existing_orders_updated++;
              console.log(`✅ Updated order ${order.order_number} with FShip data`);
            } else {
              console.log(`ℹ️  No updates needed for order ${order.order_number}`);
            }
          } else {
            console.log(`⚠️  No shipment data found for order ${order.order_number}`);
          }
        } catch (statusError) {
          console.error(`⚠️  Could not update order ${order.order_number}:`, statusError.message);
          syncResults.failed++;
          syncResults.errors.push(`Status update for ${order.order_number}: ${statusError.message}`);
        }
      }
      
      syncResults.steps_completed.push(`✅ Status updates completed: ${syncResults.status_updates} status changes`);
    }

    await transaction.commit();
    console.log("=== COMPREHENSIVE FSHIP SYNC PROCESS COMPLETED ===");
    console.log("Final results:", syncResults);

    res.json({
      success: true,
      message: "Comprehensive FShip sync completed successfully",
      results: syncResults,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("=== FSHIP SYNC PROCESS FAILED ===");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Failed to sync orders with FShip",
      error: error.message,
    });
  }
};

// Update single order from FShip (for manual updates)
module.exports.updateSingleOrderFromFShip = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    console.log(`=== UPDATING SINGLE ORDER FROM FSHIP: ${id} ===`);
    
    // Find the order
    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName"], required: false },
      ]
    });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    if (!order.fship_waybill) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order has no FShip waybill - cannot update from FShip"
      });
    }
    
    console.log(`Found order: ${order.order_number} with FShip waybill: ${order.fship_waybill}`);
    
    // Test FShip connection first
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
    
    // Update the order from FShip
    let updateResult = { updated: false, reason: "No updates needed" };
    
    try {
      // Use getShipmentStatus instead of getTrackingHistory for better reliability
      const shipmentData = await fshipService.getShipmentStatus(order.fship_waybill);
      
      if (shipmentData && shipmentData.data) {
        const fshipStatus = shipmentData.data.status || shipmentData.data.order_status;
        const newStatus = fshipService.mapFShipStatusToCrossCoin(fshipStatus);
        
        if (newStatus !== order.status) {
          await order.update({ status: newStatus }, { transaction });
          
          // Add status history
          await OrderStatusHistory.create({
            order_id: order.id,
            status: newStatus,
            notes: `FShip manual update: ${fshipStatus}`,
            created_by: "manual_fship_update",
          }, { transaction });
          
          updateResult = {
            updated: true,
            old_status: order.status,
            new_status: newStatus,
            fship_status: fshipStatus
          };
        }
      }
    } catch (trackingError) {
      console.error("Failed to get FShip shipment data:", trackingError.message);
      updateResult = {
        updated: false,
        error: true,
        reason: trackingError.message
      };
    }
    
    await transaction.commit();
    
    // Fetch the updated order to return
    const updatedOrder = await Order.findByPk(id, {
      include: [
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName"], required: false },
        { model: OrderStatusHistory, as: "OrderStatusHistories", order: [["created_at", "DESC"]], limit: 5 }
      ]
    });
    
    res.json({
      success: true,
      message: updateResult.updated ? "Order updated successfully from FShip" : "Order was already up to date",
      update_result: updateResult,
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: updatedOrder.status,
        fship_order_id: updatedOrder.fship_order_id,
        fship_waybill: updatedOrder.fship_waybill,
        tracking_number: updatedOrder.tracking_number,
        courier_name: updatedOrder.courier_name,
        created_at: updatedOrder.created_at,
        updated_at: updatedOrder.updated_at
      },
      recent_status_history: updatedOrder.OrderStatusHistories
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating single order from FShip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order from FShip",
      error: error.message
    });
  }
};

// Track and update order by order number
module.exports.trackOrderByOrderNumber = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { order_number } = req.params;
    
    console.log(`=== TRACKING ORDER BY ORDER NUMBER: ${order_number} ===`);
    
    // Find the order by order number
    const order = await Order.findOne({
      where: { order_number: order_number },
      include: [
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName"], required: false },
        { model: OrderStatusHistory, as: "OrderStatusHistories", order: [["created_at", "DESC"]], limit: 10 }
      ]
    });
    
    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `Order with number ${order_number} not found`
      });
    }
    
    console.log(`Found order: ${order.order_number} (ID: ${order.id})`);
    console.log(`Current status: ${order.status}`);
    console.log(`FShip Order ID: ${order.fship_order_id}`);
    console.log(`FShip Waybill: ${order.fship_waybill}`);
    console.log(`Tracking Number: ${order.tracking_number}`);
    
    let updateResult = null;
    let fshipData = null;
    
    // If order has FShip waybill, try to update from FShip
    if (order.fship_waybill) {
      try {
        console.log("🔐 Testing FShip connection...");
        const testResult = await fshipService.testConnection();
        if (!testResult.success) {
          throw new Error(testResult.message);
        }
        console.log("✅ FShip connection successful");
        
        console.log("🔄 Updating order from FShip...");
        const shipmentData = await fshipService.getShipmentStatus(order.fship_waybill);
        
        if (shipmentData && shipmentData.data) {
          const fshipStatus = shipmentData.data.status || shipmentData.data.order_status;
          const newStatus = fshipService.mapFShipStatusToCrossCoin(fshipStatus);
          
          if (newStatus !== order.status) {
            await order.update({ status: newStatus }, { transaction });
            
            // Add status history
            await OrderStatusHistory.create({
              order_id: order.id,
              status: newStatus,
              notes: `FShip tracking update: ${fshipStatus}`,
              created_by: "fship_tracking",
            }, { transaction });
            
            updateResult = {
              updated: true,
              old_status: order.status,
              new_status: newStatus,
              fship_status: fshipStatus
            };
          } else {
            updateResult = {
              updated: false,
              reason: "Status already up to date"
            };
          }
          
          // Prepare FShip data for response
          fshipData = {
            order_status: fshipStatus,
            tracking_history: [] // Simplified for now
          };
        } else {
          updateResult = {
            updated: false,
            reason: "No tracking data available from FShip"
          };
        }
        
      } catch (fshipError) {
        console.error("❌ FShip update failed:", fshipError.message);
        updateResult = { 
          updated: false, 
          error: true, 
          reason: fshipError.message 
        };
      }
    } else {
      console.log("⚠️  Order has no FShip waybill - cannot update from FShip");
      updateResult = { 
        updated: false, 
        reason: "No FShip waybill found for this order" 
      };
    }
    
    await transaction.commit();
    
    // Fetch the updated order to return latest data
    const finalOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: "User", attributes: ["id", "username", "email"], required: false },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "email", "firstName", "lastName"], required: false },
        { model: OrderStatusHistory, as: "OrderStatusHistories", order: [["created_at", "DESC"]], limit: 10 }
      ]
    });
    
    // Determine customer info
    const isGuestOrder = !!finalOrder.guest_user_id;
    const customerInfo = isGuestOrder ? finalOrder.GuestUser : finalOrder.User;
    
    res.json({
      success: true,
      message: updateResult?.updated ? "Order found and updated from FShip" : "Order found",
      data: {
        order: {
          id: finalOrder.id,
          order_number: finalOrder.order_number,
          status: finalOrder.status,
          payment_status: finalOrder.payment_status,
          total_amount: finalOrder.total_amount,
          final_amount: finalOrder.final_amount,
          payment_type: finalOrder.payment_type,
          fship_order_id: finalOrder.fship_order_id,
          fship_waybill: finalOrder.fship_waybill,
          tracking_number: finalOrder.tracking_number,
          courier_name: finalOrder.courier_name,
          tracking_url: finalOrder.tracking_url,
          created_at: finalOrder.createdAt || finalOrder.created_at,
          updated_at: finalOrder.updatedAt || finalOrder.updated_at
        },
        customer: {
          type: isGuestOrder ? "guest" : "registered",
          info: customerInfo
        },
        tracking: {
          has_tracking: !!finalOrder.tracking_number,
          tracking_number: finalOrder.tracking_number,
          courier_name: finalOrder.courier_name,
          tracking_url: finalOrder.tracking_url,
          current_status: finalOrder.status
        },
        fship_data: fshipData,
        update_result: updateResult,
        status_history: finalOrder.OrderStatusHistories?.map(history => ({
          id: history.id,
          status: history.status,
          notes: history.notes,
          created_at: history.createdAt || history.created_at,
          created_by: history.created_by || history.createdBy
        })) || [],
        items: finalOrder.OrderItems?.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
          product: item.Product,
          variation: item.ProductVariation
        })) || [],
        shipping_address: finalOrder.ShippingAddress || null
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Error tracking order by order number:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track order",
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

    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, attributes: ["id", "username", "email"] },
        { model: GuestUser, as: "GuestUser", attributes: ["id", "firstName", "lastName", "email"] },
        { 
          model: OrderItem, 
          as: "OrderItems",
          include: [
            { model: Product, as: "Product" },
            { model: ProductVariation, as: "ProductVariation" }
          ]
        },
        { model: ShippingAddress, as: "ShippingAddress" }
      ]
    });

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
        notes: reason || "Order cancelled by admin",
        created_by: "admin"
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

    // Restore stock for cancelled items
    for (const item of order.OrderItems) {
      if (item.variation_id) {
        // Restore variation stock
        const variation = await ProductVariation.findByPk(item.variation_id);
        if (variation) {
          variation.stock += item.quantity;
          await variation.save({ transaction });
        }
      } else {
        // Restore product stock
        const product = await Product.findByPk(item.product_id);
        if (product) {
          product.stock_quantity = (product.stock_quantity || 0) + item.quantity;
          await product.save({ transaction });
        }
      }
    }

    // Cancel order in FShip if it exists
    let fshipCancelResult = null;
    if (order.fship_waybill) {
      try {
        console.log(`🔄 Cancelling FShip order: ${order.fship_waybill}`);
        fshipCancelResult = await fshipService.cancelOrder(
          order.fship_waybill,
          reason || "Order cancelled by admin"
        );
        console.log("✅ FShip order cancelled successfully:", fshipCancelResult);
        
        // Update order with FShip cancellation info
        order.fship_status = "cancelled";
        await order.save({ transaction });
        
      } catch (err) {
        console.error("❌ Failed to cancel FShip order:", err.message);
        // Don't fail the entire operation if FShip cancellation fails
        fshipCancelResult = { 
          success: false, 
          error: err.message 
        };
      }
    }

    await transaction.commit();

    // Determine customer info for response
    const isGuestOrder = !!order.guest_user_id;
    const customerInfo = isGuestOrder ? order.GuestUser : order.User;

    res.json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: order.payment_status,
          cancelled_by: "admin",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || "Order cancelled by admin"
        },
        customer: {
          type: isGuestOrder ? "guest" : "registered",
          name: isGuestOrder 
            ? `${customerInfo.firstName} ${customerInfo.lastName}` 
            : customerInfo.username,
          email: customerInfo.email
        },
        fship_cancellation: fshipCancelResult
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

// Sync individual order with FShip
module.exports.syncSingleOrderWithFShip = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    
    console.log(`=== SYNCING SINGLE ORDER WITH FSHIP: ${id} ===`);
    
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
    
    // Check if order is already synced
    if (order.fship_order_id || order.fship_waybill) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order is already synced with FShip",
        data: {
          fship_order_id: order.fship_order_id,
          fship_waybill: order.fship_waybill
        }
      });
    }
    
    // Check if order can be synced (not cancelled or delivered)
    if (order.status === 'cancelled' || order.status === 'delivered') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot sync ${order.status} orders with FShip`
      });
    }
    
    console.log(`Found order: ${order.order_number} - Status: ${order.status}`);
    
    // Test FShip connection first
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
    
    // Check if order already exists in FShip
    try {
      console.log(`🔍 Checking if order ${order.order_number} already exists in FShip...`);
      const existsCheck = await fshipService.checkOrderExists(order.order_number);
      
      if (existsCheck.exists) {
        console.log(`⚠️ Order ${order.order_number} already exists in FShip`);
        
        // Update our local order with FShip data if we don't have it
        if (!order.fship_order_id && existsCheck.data) {
          const updateData = {};
          
          if (existsCheck.data.apiorderid) {
            updateData.fship_order_id = existsCheck.data.apiorderid;
          }
          
          if (existsCheck.data.waybill) {
            updateData.fship_waybill = existsCheck.data.waybill;
            updateData.tracking_number = existsCheck.data.waybill;
          }
          
          if (existsCheck.data.route_code) {
            updateData.fship_route_code = existsCheck.data.route_code;
          }
          
          if (existsCheck.data.order_status) {
            const newStatus = fshipService.mapFShipStatusToCrossCoin(existsCheck.data.order_status);
            if (newStatus !== order.status) {
              updateData.status = newStatus;
            }
          }
          
          if (Object.keys(updateData).length > 0) {
            await order.update(updateData, { transaction });
            console.log(`✅ Updated local order ${order.order_number} with existing FShip data`);
          }
        }
        
        await transaction.commit();
        
        return res.json({
          success: true,
          message: `Order ${order.order_number} already exists in FShip and has been synchronized`,
          data: {
            order: {
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              fship_order_id: order.fship_order_id,
              fship_waybill: order.fship_waybill,
              fship_route_code: order.fship_route_code,
              tracking_number: order.tracking_number
            },
            existing_fship_data: existsCheck.data,
            note: "Order already existed in FShip, local data updated"
          }
        });
      }
      
      console.log(`✅ Order ${order.order_number} does not exist in FShip, proceeding with creation`);
    } catch (checkError) {
      console.error(`⚠️ Could not verify if order exists in FShip: ${checkError.message}`);
      console.log("Proceeding with order creation anyway...");
    }
    
    // Get shipping address
    let shippingAddress = order.ShippingAddress;
    if (!shippingAddress) {
      if (order.user_id) {
        shippingAddress = await ShippingAddress.findOne({
          where: { user_id: order.user_id },
        });
      } else if (order.guest_user_id) {
        shippingAddress = await ShippingAddress.findOne({
          where: { guest_user_id: order.guest_user_id },
        });
      }
    }

    if (!shippingAddress) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No shipping address found for this order"
      });
    }

    // Get customer information
    const isGuestOrder = !order.User && order.GuestUser;
    const customerName = isGuestOrder 
      ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}`.trim() 
      : (order.User?.username || "Customer");
    const customerEmail = isGuestOrder 
      ? order.GuestUser.email 
      : (order.User?.email || "customer@example.com");

    // Validate customer data
    if (!customerName || customerName === '') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Customer name is required for FShip sync"
      });
    }

    if (!customerEmail || customerEmail === '') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Customer email is required for FShip sync"
      });
    }

    // Validate shipping address data
    if (!shippingAddress.phone || !shippingAddress.address || !shippingAddress.pincode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Complete shipping address (phone, address, pincode) is required for FShip sync",
        data: {
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          pincode: shippingAddress.pincode,
          city: shippingAddress.city
        }
      });
    }

    // Validate warehouse ID
    const warehouseId = parseInt(process.env.FSHIP_DEFAULT_WAREHOUSE_ID);
    if (!warehouseId || isNaN(warehouseId)) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "FSHIP_DEFAULT_WAREHOUSE_ID environment variable is not set or invalid"
      });
    }

    console.log('Validation passed:', {
      customerName,
      customerEmail,
      phone: shippingAddress.phone,
      address: shippingAddress.address,
      pincode: shippingAddress.pincode,
      city: shippingAddress.city,
      warehouseId
    });

    // Prepare FShip order data
    const fshipOrderData = {
      customer_Name: customerName,
      customer_Mobile: fshipService.formatPhoneNumber(shippingAddress.phone),
      customer_Emailid: customerEmail,
      customer_Address: shippingAddress.address,
      landMark: "",
      customer_Address_Type: "Home",
      customer_PinCode: String(shippingAddress.pincode),
      customer_City: shippingAddress.city || "Mumbai",
      orderId: String(order.order_number),
      invoice_Number: String(order.order_number),
      payment_Mode: order.payment_type === "cod" ? 1 : 2, // 1=COD, 2=PREPAID
      express_Type: "surface",
      is_Ndd: 0,
      order_Amount: parseFloat(order.total_amount) || 0,
      tax_Amount: 0,
      extra_Charges: 0,
      total_Amount: parseFloat(order.final_amount) || 0,
      shipment_Weight: 0.5, // Default weight for socks
      shipment_Length: 25,
      shipment_Width: 15,
      shipment_Height: 5,
      pick_Address_ID: warehouseId,
      return_Address_ID: warehouseId,
      products: order.OrderItems.map((item) => ({
        productName: String(item.Product.name || 'Product'),
        sku: String(item.Product.sku || `PROD-${item.Product.id}`),
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.price) || 0,
        productCategory: "Socks",
        hsnCode: "6115",
        taxRate: 0,
        productDiscount: 0
      }))
    };

    console.log(`📦 Creating FShip order for ${order.order_number}`);
    console.log('FShip Order Data:', JSON.stringify(fshipOrderData, null, 2));
    
    // Validate required fields before sending to FShip
    const requiredFields = [
      'customer_Name', 'customer_Mobile', 'customer_Address', 
      'customer_PinCode', 'customer_City', 'orderId', 
      'payment_Mode', 'express_Type', 'shipment_Weight',
      'shipment_Length', 'shipment_Width', 'shipment_Height',
      'pick_Address_ID', 'products'
    ];
    
    const missingFields = requiredFields.filter(field => !fshipOrderData[field]);
    if (missingFields.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Missing required fields for FShip: ${missingFields.join(', ')}`,
        data: fshipOrderData
      });
    }
    
    // Validate products array
    if (!Array.isArray(fshipOrderData.products) || fshipOrderData.products.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Products array is required and cannot be empty",
        data: fshipOrderData
      });
    }

    try {
      const fshipResponse = await fshipService.createForwardOrder(fshipOrderData);

      if (fshipResponse && fshipResponse.success) {
        // Update order with FShip data
        await order.update({
          fship_order_id: fshipResponse.orderId,
          fship_waybill: fshipResponse.waybill,
          fship_route_code: fshipResponse.routeCode,
          tracking_number: fshipResponse.waybill,
          status: "processing"
        }, { transaction });

        console.log(`✅ Successfully synced order ${order.order_number} with FShip`);

        // Register pickup
        try {
          await fshipService.registerPickup([fshipResponse.waybill]);
          console.log(`📦 Pickup registered for order ${order.order_number}`);
        } catch (pickupErr) {
          console.error(`Failed to register pickup for order ${order.order_number}:`, pickupErr.message);
        }

        await transaction.commit();

        // Return success response
        res.json({
          success: true,
          message: `Order ${order.order_number} synced successfully with FShip`,
          data: {
            order: {
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              fship_order_id: fshipResponse.orderId,
              fship_waybill: fshipResponse.waybill,
              fship_route_code: fshipResponse.routeCode,
              tracking_number: fshipResponse.waybill
            },
            fship_response: {
              orderId: fshipResponse.orderId,
              waybill: fshipResponse.waybill,
              routeCode: fshipResponse.routeCode,
              labelUrl: fshipResponse.labelUrl
            }
          }
        });
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Failed to create order in FShip",
          error: fshipResponse?.error || "Unknown FShip error",
          fship_response: fshipResponse
        });
      }
    } catch (fshipError) {
      await transaction.rollback();
      console.error('FShip API Error:', fshipError.message);
      return res.status(400).json({
        success: false,
        message: "Failed to sync order with FShip",
        error: fshipError.message,
        sent_data: fshipOrderData
      });
    }

  } catch (error) {
    await transaction.rollback();
    console.error("Error syncing single order with FShip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync order with FShip",
      error: error.message
    });
  }
};