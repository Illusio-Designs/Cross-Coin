const { Order } = require("../model/orderModel.js");
const { OrderItem } = require("../model/orderItemModel.js");
const { OrderStatusHistory } = require("../model/orderStatusHistoryModel.js");
const { Product } = require("../model/productModel.js");
const { ProductVariation } = require("../model/productVariationModel.js");
const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { User } = require("../model/userModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const FShipLabelDownload = require("../model/fshipLabelDownloadModel.js");
const { Op } = require("sequelize");
const XLSX = require("xlsx");
const axios = require('axios');
const { logger } = require("../config/logging.js");

// Export delivered orders to Excel
module.exports.exportDeliveredOrders = async (req, res) => {
  logger.debug('=== Export Delivered Orders Endpoint Hit ===');

  try {
    const { startDate, endDate } = req.query;

    logger.debug('Start Date:', startDate);
    logger.debug('End Date:', endDate);

    // Build query conditions for orders with delivered status
    const whereConditions = {
      status: 'delivered'
    };

    // Build date filter for OrderStatusHistory (delivery date)
    let statusHistoryWhere = {
      status: 'delivered'
    };

    // Add date filter for delivery date if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      statusHistoryWhere.createdAt = {
        [Op.between]: [start, end]
      };
      logger.debug('Delivery date range filter applied:', start, 'to', end);
    } else if (startDate) {
      statusHistoryWhere.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      statusHistoryWhere.createdAt = {
        [Op.lte]: end
      };
    }

    logger.debug('Query conditions:', JSON.stringify(whereConditions, null, 2));
    logger.debug('Status history conditions:', JSON.stringify(statusHistoryWhere, null, 2));

    // Fetch delivered orders with all related data
    logger.debug('Fetching orders from database...');
    let orders;
    try {
      orders = await Order.findAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'email'],
            required: false
          },
          {
            model: GuestUser,
            as: 'GuestUser',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            required: false
          },
          {
            model: ShippingAddress,
            as: 'ShippingAddress',
            attributes: ['full_name', 'phone', 'address', 'city', 'state', 'pincode', 'country'],
            required: false
          },
          {
            model: OrderItem,
            as: 'OrderItems',
            required: false,
            include: [
              {
                model: Product,
                as: 'Product',
                attributes: ['id', 'name', 'slug'],
                required: false
              },
              {
                model: ProductVariation,
                as: 'ProductVariation',
                attributes: ['id', 'sku', 'attributes'],
                required: false
              }
            ]
          },
          {
            model: OrderStatusHistory,
            as: 'OrderStatusHistories',
            where: statusHistoryWhere,
            required: true, // Only include orders with matching delivery date
            attributes: ['status', 'createdAt'],
            separate: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      logger.debug('Database query successful. Found orders:', orders.length);
    } catch (dbError) {
      logger.error('Database query error:', dbError.message);
      logger.error('Database error stack:', dbError.stack);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    if (orders.length === 0) {
      logger.debug('No orders found, returning empty response');
      return res.status(200).json({
        success: true,
        message: 'No delivered orders found for the selected date range',
        count: 0
      });
    }

    logger.debug('Processing orders for Excel export...');

    // Prepare data for Excel
    const excelData = [];

    orders.forEach(order => {
      const customerName = order.User?.username ||
                          (order.GuestUser ? `${order.GuestUser.firstName} ${order.GuestUser.lastName}` : 'N/A');
      const customerEmail = order.User?.email || order.GuestUser?.email || 'N/A';
      const customerPhone = order.GuestUser?.phone || order.ShippingAddress?.phone || 'N/A';
      const customerType = order.GuestUser ? 'Guest' : 'Registered';

      // Shipping address
      const shippingName = order.ShippingAddress?.full_name || 'N/A';
      const shippingPhone = order.ShippingAddress?.phone || 'N/A';
      const shippingAddress = order.ShippingAddress?.address || 'N/A';
      const shippingCity = order.ShippingAddress?.city || 'N/A';
      const shippingState = order.ShippingAddress?.state || 'N/A';
      const shippingPincode = order.ShippingAddress?.pincode || 'N/A';
      const shippingCountry = order.ShippingAddress?.country || 'India';

      // Order details
      const orderNumber = order.order_number;
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');

      // Get actual delivery date from status history
      const deliveredStatusHistory = order.OrderStatusHistories?.find(h => h.status === 'delivered');
      const deliveryDate = deliveredStatusHistory
        ? new Date(deliveredStatusHistory.createdAt).toLocaleDateString('en-IN')
        : 'N/A';

      // Payment details
      const paymentType = order.payment_type === 'cod' ? 'COD' : 'Prepaid';
      const paymentStatus = order.payment_status === 'paid' ? 'Paid' : 'Pending';

      // Shipping details
      const awbNumber = order.fship_waybill || 'N/A';
      const courierName = order.courier_name || 'N/A';
      const trackingNumber = order.tracking_number || 'N/A';

      // Order totals
      const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
      const shippingFee = parseFloat(order.shipping_fee || 0).toFixed(2);
      const discountAmount = parseFloat(order.discount_amount || 0).toFixed(2);
      const finalAmount = parseFloat(order.final_amount || 0).toFixed(2);

      // Add each order item as a separate row
      if (order.OrderItems && order.OrderItems.length > 0) {
        order.OrderItems.forEach((item, index) => {
          const productName = item.Product?.name || 'N/A';
          const sku = item.ProductVariation?.sku || 'N/A';
          const quantity = item.quantity || 0;
          const price = parseFloat(item.price || 0).toFixed(2);
          const itemSubtotal = parseFloat(item.subtotal || 0).toFixed(2);

          // Parse attributes
          let attributes = '';
          if (item.ProductVariation?.attributes) {
            try {
              const attrs = typeof item.ProductVariation.attributes === 'string'
                ? JSON.parse(item.ProductVariation.attributes)
                : item.ProductVariation.attributes;

              const attrParts = [];
              if (attrs.size) attrParts.push(`Size: ${Array.isArray(attrs.size) ? attrs.size.join(', ') : attrs.size}`);
              if (attrs.color) attrParts.push(`Color: ${Array.isArray(attrs.color) ? attrs.color.join(', ') : attrs.color}`);
              attributes = attrParts.join(' | ');
            } catch (e) {
              attributes = 'N/A';
            }
          }

          excelData.push({
            'Order Number': orderNumber,
            'Order Date': orderDate,
            'Delivery Date': deliveryDate,
            'Customer Name': customerName,
            'Customer Email': customerEmail,
            'Customer Phone': customerPhone,
            'Customer Type': customerType,
            'Shipping Name': shippingName,
            'Shipping Phone': shippingPhone,
            'Shipping Address': shippingAddress,
            'City': shippingCity,
            'State': shippingState,
            'Pincode': shippingPincode,
            'Country': shippingCountry,
            'Product Name': productName,
            'SKU': sku,
            'Attributes': attributes,
            'Quantity': quantity,
            'Price per Unit': price,
            'Item Subtotal': itemSubtotal,
            'Order Subtotal': index === 0 ? subtotal : '',
            'Shipping Fee': index === 0 ? shippingFee : '',
            'Discount': index === 0 ? discountAmount : '',
            'Final Amount': index === 0 ? finalAmount : '',
            'Payment Type': paymentType,
            'Payment Status': paymentStatus,
            'AWB Number': awbNumber,
            'Courier': courierName,
            'Tracking Number': trackingNumber,
            'Order Status': 'Delivered'
          });
        });
      } else {
        // If no items, add order without product details
        excelData.push({
          'Order Number': orderNumber,
          'Order Date': orderDate,
          'Delivery Date': deliveryDate,
          'Customer Name': customerName,
          'Customer Email': customerEmail,
          'Customer Phone': customerPhone,
          'Customer Type': customerType,
          'Shipping Name': shippingName,
          'Shipping Phone': shippingPhone,
          'Shipping Address': shippingAddress,
          'City': shippingCity,
          'State': shippingState,
          'Pincode': shippingPincode,
          'Country': shippingCountry,
          'Product Name': 'N/A',
          'SKU': 'N/A',
          'Attributes': 'N/A',
          'Quantity': 0,
          'Price per Unit': '0.00',
          'Item Subtotal': '0.00',
          'Order Subtotal': subtotal,
          'Shipping Fee': shippingFee,
          'Discount': discountAmount,
          'Final Amount': finalAmount,
          'Payment Type': paymentType,
          'Payment Status': paymentStatus,
          'AWB Number': awbNumber,
          'Courier': courierName,
          'Tracking Number': trackingNumber,
          'Order Status': 'Delivered'
        });
      }
    });

    logger.debug('Excel data prepared. Total rows:', excelData.length);

    // Create workbook and worksheet
    logger.debug('Creating Excel workbook...');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    logger.debug('Worksheet created successfully');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Order Number
      { wch: 12 }, // Order Date
      { wch: 12 }, // Delivery Date
      { wch: 20 }, // Customer Name
      { wch: 25 }, // Customer Email
      { wch: 15 }, // Customer Phone
      { wch: 12 }, // Customer Type
      { wch: 20 }, // Shipping Name
      { wch: 15 }, // Shipping Phone
      { wch: 35 }, // Shipping Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // Pincode
      { wch: 10 }, // Country
      { wch: 30 }, // Product Name
      { wch: 15 }, // SKU
      { wch: 25 }, // Attributes
      { wch: 10 }, // Quantity
      { wch: 12 }, // Price per Unit
      { wch: 12 }, // Item Subtotal
      { wch: 12 }, // Order Subtotal
      { wch: 12 }, // Shipping Fee
      { wch: 10 }, // Discount
      { wch: 12 }, // Final Amount
      { wch: 12 }, // Payment Type
      { wch: 12 }, // Payment Status
      { wch: 15 }, // AWB Number
      { wch: 15 }, // Courier
      { wch: 15 }, // Tracking Number
      { wch: 12 }  // Order Status
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Delivered Orders');
    logger.debug('Worksheet added to workbook');

    // Generate buffer
    logger.debug('Generating Excel buffer...');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    logger.debug('Excel buffer generated. Size:', excelBuffer.length, 'bytes');

    // Set response headers
    const filename = `Delivered_Orders_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`;
    logger.debug('Setting response headers. Filename:', filename);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the file
    logger.debug('Sending Excel file...');
    res.send(excelBuffer);
    logger.debug('Export completed successfully!');

  } catch (error) {
    logger.error('=== Error exporting delivered orders ===');
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to export delivered orders',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================
// FShip Label Management Functions
// ============================================

// Mark label as downloaded
module.exports.markLabelDownloaded = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.fship_label_url) {
      return res.status(400).json({
        success: false,
        message: 'No shipping label available for this order'
      });
    }

    // Update order
    await order.update({
      fship_label_downloaded: true,
      fship_label_downloaded_at: new Date(),
      fship_label_downloaded_by: userId
    });

    // Create download history record
    await FShipLabelDownload.create({
      order_id: orderId,
      user_id: userId,
      download_type: 'single',
      ip_address: ipAddress
    });

    res.status(200).json({
      success: true,
      message: 'Label marked as downloaded',
      data: order
    });
  } catch (error) {
    logger.error('Error marking label as downloaded:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking label as downloaded',
      error: error.message
    });
  }
};

// Download single label
module.exports.downloadLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const order = await Order.findByPk(orderId);

    if (!order || !order.fship_label_url) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }

    // Download the label from FShip URL
    const response = await axios.get(order.fship_label_url, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    // Mark as downloaded
    await order.update({
      fship_label_downloaded: true,
      fship_label_downloaded_at: new Date(),
      fship_label_downloaded_by: userId
    });

    // Create download history
    await FShipLabelDownload.create({
      order_id: orderId,
      user_id: userId,
      download_type: 'single',
      ip_address: ipAddress
    });

    // Send file to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label-${order.order_number}.pdf`);
    res.send(Buffer.from(response.data));
  } catch (error) {
    logger.error('Error downloading label:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading label',
      error: error.message
    });
  }
};

// Bulk download labels
module.exports.bulkDownloadLabels = async (req, res) => {
  try {
    const { orderIds } = req.body; // Array of order IDs
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order IDs'
      });
    }

    // Fetch orders with labels
    const orders = await Order.findAll({
      where: {
        id: orderIds,
        fship_label_url: { [Op.ne]: null }
      }
    });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No labels found for selected orders'
      });
    }

    // Import pdf-lib for merging PDFs
    const { PDFDocument } = require('pdf-lib');

    logger.debug('=== Starting PDF merge process ===');
    logger.debug(`Merging ${orders.length} labels`);

    // Create a new merged PDF document
    const mergedPdf = await PDFDocument.create();

    // Download and merge each label
    for (const order of orders) {
      try {
        const response = await axios.get(order.fship_label_url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        // Load the PDF
        const pdfDoc = await PDFDocument.load(response.data);

        // Copy all pages from this PDF to the merged PDF
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        // Mark as downloaded
        await order.update({
          fship_label_downloaded: true,
          fship_label_downloaded_at: new Date(),
          fship_label_downloaded_by: userId
        });

        // Create download history
        await FShipLabelDownload.create({
          order_id: order.id,
          user_id: userId,
          download_type: 'bulk',
          ip_address: ipAddress
        });
      } catch (error) {
        logger.error(`Error downloading label for order ${order.id}:`, error);
      }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    logger.debug('=== PDF merge completed ===');
    logger.debug(`Merged PDF size: ${mergedPdfBytes.length} bytes`);

    // Send the merged PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=merged-labels-${Date.now()}.pdf`);
    res.send(Buffer.from(mergedPdfBytes));

  } catch (error) {
    logger.error('Error bulk downloading labels:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk downloading labels',
      error: error.message
    });
  }
};

// Get orders with pending labels
module.exports.getPendingLabels = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where: {
        fship_label_url: { [Op.ne]: null },
        fship_label_downloaded: false
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email']
        },
        {
          model: GuestUser,
          as: 'GuestUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ShippingAddress,
          as: 'ShippingAddress'
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching pending labels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending labels',
      error: error.message
    });
  }
};

// Get label download statistics
module.exports.getLabelDownloadStats = async (req, res) => {
  try {
    const totalLabels = await Order.count({
      where: { fship_label_url: { [Op.ne]: null } }
    });

    const downloadedLabels = await Order.count({
      where: {
        fship_label_url: { [Op.ne]: null },
        fship_label_downloaded: true
      }
    });

    const pendingLabels = totalLabels - downloadedLabels;

    const recentDownloads = await FShipLabelDownload.findAll({
      limit: 10,
      order: [['downloaded_at', 'DESC']],
      include: [
        {
          model: Order,
          as: 'Order',
          attributes: ['id', 'order_number']
        },
        {
          model: User,
          as: 'DownloadedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalLabels,
        downloadedLabels,
        pendingLabels,
        downloadRate: totalLabels > 0 ? ((downloadedLabels / totalLabels) * 100).toFixed(2) : 0,
        recentDownloads
      }
    });
  } catch (error) {
    logger.error('Error fetching label stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching label statistics',
      error: error.message
    });
  }
};
