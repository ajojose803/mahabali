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
        res.render('user/myAccount', { title: "User-Profile", user, categories,itemCount, currentPage, orders,successMessages })
    } catch (err) {
        console.log(err)
        res.render('user/servererror')

    }
}

const showaddress=async (req,res)=>{
    try{
        const successMessages  = req.flash('success')
        const errorMessages = req.flash('error')
        const currentPage='profile';
        const userId = req.session.userId
        const categories=await Category.find({status:true}).limit(3)
        const data = await Address.findOne({ userId: userId })
        req.session.checkoutSave=false;
      const itemCount = req.session.cartCount;
        res.render('user/address', { title:'UrbanKicks - Addresses',itemCount,user: data ,categories,currentPage,errorMessages,successMessages})
    }catch(error){
        console.log(error)
        res.render('user/servererror')
    }
}

const LoadAddAddress = async (req, res) => {
    try {
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3)
        const id = req.session.userId;
        const user = await User.findOne({ _id: id })
      const itemCount = req.session.cartCount;
        res.render('user/addAddress', { title: "Urban Kicks - profile", categories,itemCount, currentPage, user })
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const addaddress = async (req, res) => {
    try {
        const { name, mobile, email, housename, street, city, state, country, pincode, saveas } = req.body;
        const userId = req.session.userId;
        const existingUser = await Address.findOne({ userId: userId });

        if (existingUser) {
            const existingAddress = existingUser.address.find(addr => addr.save_as === saveas);

            if (existingAddress) {
                const errorMessage = req.session.checkoutSave ? `${existingAddress.save_as} address already exists!` : `${existingAddress.save_as} address already exists! Use edit address..`;
                req.flash('error', errorMessage);
                return res.redirect(req.session.checkoutSave ? `/checkout` : `/address`);
            }

            existingUser.address.push({
                name: name,
                mobile: mobile,
                email: email,
                housename: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                save_as: saveas
            });

            await existingUser.save();
            req.flash('success', "Address added successfully!!!");
            return res.redirect(req.session.checkoutSave ? `/checkout` : `/address`);
        }

        const newAddress = await Address.create({
            userId: userId,
            address: {
                name: name,
                mobile: mobile,
                email: email,
                housename: housename,
                street: street,
                city: city,
                state: state,
                country: country,
                pincode: pincode,
                save_as: saveas,
            },
        });

        req.flash('success', "Address added successfully!!!");
        return res.redirect(req.session.checkoutSave ? `/checkout` : `/address`);
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
}


const LoadEditAddress = async (req, res) => {
    try {
        const currentPage = 'profile';
        const userId = req.session.userId;
        const categories = await Category.find({ status: true }).limit(3)
        const id = req.params.id;
      const itemCount = req.session.cartCount;
        const address = await Address.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            },
            {
                $unwind: '$address'
            },
            {
                $match: { 'address._id': new mongoose.Types.ObjectId(id) }
            }
        ]);

        res.render('user/editAddress', { title:"Urban Kicks- edit address", adress: address[0],itemCount, categories , currentPage });
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
}

const editaddress = async (req, res) => {
    try {
        const { name, mobile, email, housename, street, city, state, country, pincode, saveas } = req.body;
        const addressId = req.params.id
        const userId = req.session.userId;

        const isAddressExists = await Address.findOne({
            'userId': userId,
            'address': {
                $elemMatch: {
                    '_id': { $ne: addressId },
                    'save_as': saveas,
                    'email': email,
                    'name': name,
                    'mobile': mobile,
                    'housename': housename,
                    'street': street,
                    'pincode': pincode,
                    'city': city,
                    'state': state,
                    'country': country,

                }
            }
        });

        if (isAddressExists) {
            return res.status(400).send('Address already exists');
        }
        const result = await Address.updateOne(
            { 'userId': userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.save_as': saveas,
                    'address.$.name': name,
                    'address.$.email': email,
                    'address.$.mobile': mobile,
                    'address.$.housename': housename,
                    'address.$.street': street,
                    'address.$.pincode': pincode,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.country': country,

                }
            }
        );
        req.flash('success',"Address updated successfully!!!")
        res.redirect('/address');
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.userId;
        const id = req.params.id;
        const result = await Address.updateOne(
            { userId: userId, 'address._id': id },
            { $pull: { address: { _id: id } } }
        );
        req.flash('error',"Address deleted successfully!!!")
        res.redirect('/address');
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}


const LoadResetPassword = async (req, res) => {
    try {
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3)
        const pass = req.flash('pass')
      const itemCount = req.session.cartCount;
        res.render('user/resetpassword', { title:"Urbankicks - Reset password ",pass,itemCount, categories,currentPage })
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const updatePassword = async (req, res) => {
    try {
        const { pass, npass} = req.body
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
    LoadProfile,
    LoadAddAddress,
    addaddress,
    showaddress,
    LoadEditAddress,
   editaddress,
   deleteAddress,
   LoadResetPassword,
   updatePassword,
}