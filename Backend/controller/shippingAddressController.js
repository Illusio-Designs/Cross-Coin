const { ShippingAddress } = require("../model/shippingAddressModel.js");
const { GuestUser } = require("../model/guestUserModel.js");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db.js");

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
        phone: phone_number,
        is_default: makeDefault,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      message: "Shipping address created successfully",
      shippingAddress,
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

    const shippingAddresses = await ShippingAddress.findAll({
      where: { user_id: userId },
      order: [
        ["is_default", "DESC"], // Default address first
        ["createdAt", "DESC"], // Then newest first
      ],
    });

    res.json({ shippingAddresses });
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
    await shippingAddress.update(
      {
        address: address || shippingAddress.address,
        city: city || shippingAddress.city,
        state: state || shippingAddress.state,
        pincode: postal_code || shippingAddress.pincode,
        country: country || shippingAddress.country,
        phone: phone_number || shippingAddress.phone,
        is_default:
          is_default !== undefined ? is_default : shippingAddress.is_default,
      },
      { transaction }
    );

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

// Guest-specific shipping address functions (no authentication required)
module.exports.createGuestShippingAddress = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      address,
      city,
      state,
      postal_code,
      country,
      phone_number,
      guest_info,
    } = req.body;

    // Validate required fields
    if (
      !address ||
      !city ||
      !state ||
      !postal_code ||
      !country ||
      !phone_number ||
      !guest_info
    ) {
      await transaction.rollback();
      return res.status(400).json({ message: "All fields are required" });
    }

    const { email, firstName, lastName } = guest_info;
    if (!email || !firstName || !lastName) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Guest info (email, firstName, lastName) is required",
      });
    }

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
          phone: phone_number,
          status: "active",
        },
        { transaction }
      );
    }

    // Create the shipping address for guest
    const shippingAddress = await ShippingAddress.create(
      {
        guest_user_id: guestUser.id,
        full_name: `${firstName} ${lastName}`.trim(),
        address,
        city,
        state,
        pincode: postal_code,
        country,
        phone: phone_number,
        is_default: true, // Guest addresses are always default
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      message: "Guest shipping address created successfully",
      shippingAddress,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating guest shipping address:", error);
    res.status(500).json({
      message: "Failed to create guest shipping address",
      error: error.message,
    });
  }
};

module.exports.getGuestShippingAddresses = async (req, res) => {
  try {
    const { guest_email } = req.query;

    if (!guest_email) {
      return res.status(400).json({ message: "Guest email is required" });
    }

    // Find guest user
    const guestUser = await GuestUser.findOne({
      where: { email: guest_email.toLowerCase() },
    });

    if (!guestUser) {
      return res.json({ shippingAddresses: [] });
    }

    const shippingAddresses = await ShippingAddress.findAll({
      where: { guest_user_id: guestUser.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({ shippingAddresses });
  } catch (error) {
    console.error("Error getting guest shipping addresses:", error);
    res.status(500).json({
      message: "Failed to get guest shipping addresses",
      error: error.message,
    });
  }
};
