const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.js");
const { encrypt, decrypt } = require("../utils/encryption.js");

// Create a new shipping address
module.exports.createShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      address,
      city,
      state,
      postal_code,
      country,
      phone_number,
      is_default,
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (
      !address ||
      !city ||
      !state ||
      !postal_code ||
      !country ||
      !phone_number
    ) {
      await transaction.rollback();
      return res.status(400).json({ message: "All fields are required" });
    }

    // If setting as default, unset any existing default address
    if (is_default) {
      await ShippingAddress.update(
        { is_default: false },
        {
          where: {
            user_id: userId,
            is_default: true,
          },
          transaction,
        }
      );
    }

    // Check if this is the first address for the user
    const addressCount = await ShippingAddress.count({
      where: { user_id: userId },
      transaction,
    });

    // If it's the first address, set it as default regardless of input
    const makeDefault = addressCount === 0 ? true : is_default || false;

    // Create the shipping address
    const shippingAddress = await ShippingAddress.create(
      {
        user_id: userId,
        full_name: `${req.user.firstName || ""} ${
          req.user.lastName || ""
        }`.trim(),
        address,
        city,
        state,
        pincode: postal_code,
        country,
        phone: encrypt(phone_number),
        is_default: makeDefault,
      },
      { transaction }
    );

    await transaction.commit();

    // Transform response to match frontend expectations
    const responseAddress = {
      id: shippingAddress.id,
      user_id: shippingAddress.user_id,
      full_name: shippingAddress.full_name,
      address: shippingAddress.address,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.pincode, // Transform pincode to postal_code
      pincode: shippingAddress.pincode, // Keep both for compatibility
      country: shippingAddress.country,
      phone_number: decrypt(shippingAddress.phone), // Transform phone to phone_number
      phone: decrypt(shippingAddress.phone), // Keep both for compatibility
      is_default: shippingAddress.is_default,
      createdAt: shippingAddress.createdAt,
      updatedAt: shippingAddress.updatedAt
    };

    res.status(201).json({
      message: "Shipping address created successfully",
      shippingAddress: responseAddress,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating shipping address:", error);
    res.status(500).json({
      message: "Failed to create shipping address",
      error: error.message,
    });
  }
};

// Get all shipping addresses for a user
module.exports.getUserShippingAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Also find guest_user_ids linked to this user's orders
    const { Order } = require('../model/orderModel.js');
    const linkedGuestIds = await Order.findAll({
      where: { user_id: userId, guest_user_id: { [Op.ne]: null } },
      attributes: ['guest_user_id'],
      raw: true,
    }).then(rows => [...new Set(rows.map(r => r.guest_user_id).filter(Boolean))]);

    const whereClause = linkedGuestIds.length > 0
      ? { [Op.or]: [{ user_id: userId }, { guest_user_id: linkedGuestIds }] }
      : { user_id: userId };

    const shippingAddresses = await ShippingAddress.findAll({
      where: whereClause,
      order: [
        ["is_default", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    // Transform addresses to match frontend expectations
    const transformedAddresses = shippingAddresses.map(addr => ({
      id: addr.id,
      user_id: addr.user_id,
      full_name: addr.full_name,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      postal_code: addr.pincode, // Transform pincode to postal_code
      pincode: addr.pincode, // Keep both for compatibility
      country: addr.country,
      phone_number: addr.phone, // Transform phone to phone_number
      phone: addr.phone, // Keep both for compatibility
      is_default: addr.is_default,
      createdAt: addr.createdAt,
      updatedAt: addr.updatedAt
    }));

    res.json({ shippingAddresses: transformedAddresses });
  } catch (error) {
    console.error("Error getting shipping addresses:", error);
    res.status(500).json({
      message: "Failed to get shipping addresses",
      error: error.message,
    });
  }
};

// Get a shipping address by ID
module.exports.getShippingAddressById = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    const shippingAddress = await ShippingAddress.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
    });

    if (!shippingAddress) {
      return res.status(404).json({ message: "Shipping address not found" });
    }

    res.json({ shippingAddress });
  } catch (error) {
    console.error("Error getting shipping address:", error);
    res.status(500).json({
      message: "Failed to get shipping address",
      error: error.message,
    });
  }
};

// Update a shipping address
module.exports.updateShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const addressId = req.params.id;
    const userId = req.user.id;
    const {
      address,
      city,
      state,
      postal_code,
      country,
      phone_number,
      is_default,
    } = req.body;

    // Find the address to update
    const shippingAddress = await ShippingAddress.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
      transaction,
    });

    if (!shippingAddress) {
      await transaction.rollback();
      return res.status(404).json({ message: "Shipping address not found" });
    }

    // If setting as default, unset any existing default address
    if (is_default) {
      await ShippingAddress.update(
        { is_default: false },
        {
          where: {
            user_id: userId,
            is_default: true,
            id: { [Op.ne]: addressId }, // Don't update the current one
          },
          transaction,
        }
      );
    }

    // Update the address
    const updatePayload = {
      address: address || shippingAddress.address,
      city: city || shippingAddress.city,
      state: state || shippingAddress.state,
      pincode: postal_code || shippingAddress.pincode,
      country: country || shippingAddress.country,
      is_default:
        is_default !== undefined ? is_default : shippingAddress.is_default,
    };

    // Only update phone when explicitly provided; avoids re-encrypting an
    // unchanged phone value on every update request.
    if (phone_number !== undefined) {
      updatePayload.phone = phone_number;
    }

    await shippingAddress.update(updatePayload, { transaction });

    await transaction.commit();

    // Fetch the updated address
    const updatedAddress = await ShippingAddress.findByPk(addressId);

    res.json({
      message: "Shipping address updated successfully",
      shippingAddress: updatedAddress,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating shipping address:", error);
    res.status(500).json({
      message: "Failed to update shipping address",
      error: error.message,
    });
  }
};

// Delete a shipping address
module.exports.deleteShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    // Find the address to delete
    const shippingAddress = await ShippingAddress.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
      transaction,
    });

    if (!shippingAddress) {
      await transaction.rollback();
      return res.status(404).json({ message: "Shipping address not found" });
    }

    // Check if this was the default address
    const wasDefault = shippingAddress.is_default;

    // Delete the address
    await shippingAddress.destroy({ transaction });

    // If the deleted address was the default, set a new default
    if (wasDefault) {
      const anotherAddress = await ShippingAddress.findOne({
        where: { user_id: userId },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      if (anotherAddress) {
        anotherAddress.is_default = true;
        await anotherAddress.save({ transaction });
      }
    }

    await transaction.commit();

    res.json({ message: "Shipping address deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting shipping address:", error);
    res.status(500).json({
      message: "Failed to delete shipping address",
      error: error.message,
    });
  }
};

// Set a shipping address as default
module.exports.setDefaultShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const addressId = req.params.id;
    const userId = req.user.id;

    // Verify the address exists and belongs to user
    const shippingAddress = await ShippingAddress.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
      transaction,
    });

    if (!shippingAddress) {
      await transaction.rollback();
      return res.status(404).json({ message: "Shipping address not found" });
    }

    // Unset any existing default address
    await ShippingAddress.update(
      { is_default: false },
      {
        where: {
          user_id: userId,
          is_default: true,
        },
        transaction,
      }
    );

    // Set this address as default
    shippingAddress.is_default = true;
    await shippingAddress.save({ transaction });

    await transaction.commit();

    res.json({
      message: "Default shipping address updated successfully",
      shippingAddress,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error setting default shipping address:", error);
    res.status(500).json({
      message: "Failed to set default shipping address",
      error: error.message,
    });
  }
};

// Guest-specific shipping address — now creates/finds a consumer user instead of GuestUser
module.exports.createGuestShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { address, city, state, postal_code, country, phone_number, guest_info } = req.body;
    const { email, firstName, lastName } = guest_info || {};

    if (!address || !city || !state || !postal_code || !phone_number || !email || !firstName) {
      await transaction.rollback();
      return res.status(400).json({ message: "All fields are required" });
    }

    const bcrypt = require('bcrypt');
    const { User } = require('../model/userModel.js');
    const digits = String(phone_number).replace(/\D/g, '').slice(-10);

    // Find or create consumer user — no GuestUser created
    let user = await User.findOne({ where: { phone: digits }, transaction });
    if (!user) user = await User.findOne({ where: { email: email.toLowerCase() }, transaction });
    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      user = await User.create({
        username: `${firstName} ${lastName || ''}`.trim(),
        email: email.toLowerCase(),
        phone: digits,
        password: tempPassword,
        role: 'consumer',
      }, { transaction });
    }

    const shippingAddress = await ShippingAddress.create({
      user_id: user.id,
      full_name: `${firstName} ${lastName || ''}`.trim(),
      address, city, state,
      pincode: postal_code,
      country: country || 'India',
      phone: phone_number,
      is_default: true,
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ message: "Shipping address created successfully", shippingAddress });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: "Failed to create shipping address", error: error.message });
  }
};

module.exports.getGuestShippingAddresses = async (req, res) => {
  try {
    const { guest_email } = req.query;
    if (!guest_email) return res.json({ shippingAddresses: [] });

    const { User } = require('../model/userModel.js');
    const user = await User.findOne({ where: { email: guest_email.toLowerCase() } });
    if (!user) return res.json({ shippingAddresses: [] });

    const shippingAddresses = await ShippingAddress.findAll({
      where: { user_id: user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json({ shippingAddresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to get shipping addresses", error: error.message });
  }
};

