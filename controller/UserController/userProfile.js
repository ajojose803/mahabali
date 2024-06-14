const Address = require('../../model/addressModel');
const Category = require('../../model/categoryModel')
const Product = require('../../model/productModel')
const User = require('../../model/userModel')
const Order = require('../../model/orderModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')


const LoadProfile = async (req, res) => {
    try {
        const successMessages = req.flash('success')
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3);
        const id = req.session.userId;
        const user = await User.findOne({ _id: id })
        const orders = await Order.find({ userId: id }).sort({ createdAt: -1 }).populate({
            path: 'items.productId',
            select: 'name image description'
        })
        const itemCount = req.session.cartCount;
        res.render('user/myAccount', { title: "User-Profile", user, categories, itemCount, currentPage, orders, successMessages })
    } catch (err) {
        console.log(err)
        res.render('user/servererror')

    }
}

const showaddress = async (req, res) => {
    try {
        const successMessages = req.flash('success');
        const errorMessages = req.flash('error');
        const currentPage = 'profile';
        const userId = req.session.userId;
        

        const user = await User.findOne({ _id: userId });
   

        const categories = await Category.find({ status: true }).limit(3);
        
        const addresses = await Address.findOne({ userId: userId });
        
        req.session.checkoutSave = false;
        const itemCount = req.session.cartCount;
        
        res.render('user/address', {
            itemCount, 
           user,
            addresses, 
            categories, 
            currentPage, 
            errorMessages, 
            successMessages
        });
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};


const LoadAddAddress = async (req, res) => {
    try {
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3);
        const id = req.session.userId;
        const user = await User.findOne({ _id: id });
        const itemCount = req.session.cartCount;
        res.render('user/profile/addAddress',{user, categories, itemCount, currentPage, user });
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};

const addAddress = async (req, res) => {
    try {
        const { firstName, lastName, phone, email, addressline1, addressline2, city, state, country, pincode, setDefault } = req.body;
        const userId = req.session.userId;

        console.log(userId);
        console.log(req.body);

        const existingUser = await Address.findOne({ userId: userId });
        console.log("existingUser:", existingUser);

        if (existingUser) {
            existingUser.address.push({
                firstName, lastName, phone, email, addressline1, addressline2, city, state, country, pincode
            });

            if (setDefault === 'on') {
                // Reset the 'status' field for all addresses of the user
                await Address.updateMany(
                    { userId: userId },
                    { $set: { 'address.$[].status': false } }
                );

                // Set the 'status' field to true for the newly added address
                existingUser.address[existingUser.address.length - 1].status = true;
            }

            await existingUser.save();
            req.flash('success', "Address added successfully!!!");
            return res.redirect(req.session.checkoutSave ? `/checkout` : `/profile/address`);
        }

        const newAddress = new Address({
            userId: userId,
            address: [{
                firstName, lastName, phone, email, addressline1, addressline2, city, state, country, pincode,
                status: setDefault === 'on'  // Set status true if checkbox is checked
            }]
        });

        await newAddress.save();
        req.flash('success', "Address added successfully!!!");
        console.log("Address saved successfully");
        return res.redirect(req.session.checkoutSave ? `/checkout` : `/profile/address`);
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};



const LoadEditAddress = async (req, res) => {
    try {
        const currentPage = 'profile';
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const categories = await Category.find({ status: true }).limit(3);
        const id = req.params.id;
        const itemCount = req.session.cartCount;

        // Log the raw IDs
        console.log("Raw User ID:", userId);
        console.log("Raw Address ID:", id);

        // Convert IDs to ObjectId
        const userIdObject = new mongoose.Types.ObjectId(userId);
        const addressIdObject = new mongoose.Types.ObjectId(id);

        console.log("Converted User ID:", userIdObject);
        console.log("Converted Address ID:", addressIdObject);

        // Fetch the user document
        const userDocument = await Address.findOne({ userId: userIdObject });
        console.log("User Document:", JSON.stringify(userDocument, null, 2));

        // Find the address by Id within the user document
        const address = userDocument.address.find(addr => addr._id.toString() === addressIdObject.toString());

        if (!address) {
            console.error("No address found with the given ID for the user.");
            req.flash('error', 'Address not found');
            return res.redirect('/profile/address');
        }

        res.render('user/profile/editAddress', { user, address, itemCount, categories, currentPage });
    } catch (error) {
        console.error("Error loading edit address page:", error);
        res.render('user/servererror');
    }
};





const editaddress = async (req, res) => {
    try {
        const { firstName, lastName, phone, email, addressline1, addressline2, city, state, country, pincode } = req.body;
        const addressId = req.params.id;
        const userId = req.session.userId;

        const isAddressExists = await Address.findOne({
            'userId': userId,
            'address': {
                $elemMatch: {
                    '_id': { $ne: addressId },
                    'address.$.firstname': firstName,
                    'address.$.lastName': lastName,
                    'address.$.email': email,
                    'address.$.phone': phone,
                    'address.$.addressline1': addressline1,
                    'address.$.addressline2': addressline2,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,
                    'address.$.pincode': pincode,
                }
            }
        });

        if (isAddressExists) {
            req.flash('error', 'Address already exists');
            return res.redirect(`/address/${addressId}/edit`);
        }

        await Address.updateOne(
            { 'userId': userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.firstname': firstName,
                    'address.$.lastName': lastName,
                    'address.$.email': email,
                    'address.$.phone': phone,
                    'address.$.addressline1': addressline1,
                    'address.$.addressline2': addressline2,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,
                    'address.$.pincode': pincode,
                }
            }
        );

        req.flash('success', "Address updated successfully!!!");
        res.redirect('/profile/address');
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};


const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const addressId = req.params.id;
        await Address.updateOne(
            { userId: userId },
            { $pull: { address: { _id: addressId } } }
        );
        req.flash('success', "Address deleted successfully!!!");
        res.redirect('/profile/address');
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};


const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const id = req.params.id;

        // Reset the 'status' field for all addresses of the user
        await Address.updateMany(
            { userId: userId },
            { $set: { 'address.$[].status': false } }
        );

        // Set the 'status' field to true for the specified address
        await Address.updateOne(
            { userId: userId, 'address._id': id },
            { $set: { 'address.$.status': true } }
        );

        req.flash('success', "Default address set successfully!!!");
        res.redirect('/profile/address');  // Corrected the redirect URL
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};



const LoadResetPassword = async (req, res) => {
    try {
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3)
        const pass = req.flash('pass')
        const itemCount = req.session.cartCount;
        res.render('user/resetpassword', { title: "Urbankicks - Reset password ", pass, itemCount, categories, currentPage })
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const updatePassword = async (req, res) => {
    try {
        const { pass, npass } = req.body
        const userId = req.session.userId
        const user = await User.findOne({ _id: userId })

        if (!user.password) {
            req.flash('pass', 'You signed up with Google, try to set password through forgot password!');
            return res.redirect('/resetpassword');
        }
        const isPassword = await bcrypt.compare(npass, user.password)
        if (isPassword) {
            req.flash('pass', 'Enter Different Password')
            return res.redirect('/resetpassword');
        }
        const passwordmatch = await bcrypt.compare(pass, user.password)
        if (passwordmatch) {
            const hashedpassword = await bcrypt.hash(npass, 10)
            const newuser = await User.updateOne({ _id: userId }, { password: hashedpassword })
            req.flash("success", "Password updated successfully!");
            return res.redirect('/profile')

        }
        else {
            req.flash("pass", "Incorrect Password");
            return res.redirect('/resetpassword');
        }

    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}




module.exports = {
    setDefaultAddress,
    LoadProfile,
    LoadAddAddress,
    addAddress,
    showaddress,
    LoadEditAddress,
    editaddress,
    deleteAddress,
    LoadResetPassword,
    updatePassword,
}