const Address = require('../../model/addressModel');
const Category = require('../../model/categoryModel')
const Product = require('../../model/productModel')
const User = require('../../model/userModel')
const Wallet = require('../../model/walletModel')
const Order = require('../../model/orderModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const asyncHandler = require('../../middleware/asyncHandler');
const PDFDocument = require('pdfkit');
const fs = require('fs');


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
        res.render('user/myAccount', { user, categories, itemCount, currentPage, orders, successMessages })
    } catch (err) {
        console.log(err)
        res.render('user/servererror')

    }
}
const updateProfile = asyncHandler(async (req, res) => {
    const { username, phone } = req.body;
    console.log("Name: " + username, phone) 

    try {
        const userId = req.session.userId; 
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { username, phone }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        
        req.flash('success', 'Profile updated successfully');

        res.redirect('/profile'); 
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' }); 
    }
});

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
        res.render('user/profile/addAddress', { user, categories, itemCount, currentPage, user });
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
};

const addAddress = async (req, res) => {
    try {
        const { firstName, lastName, phone, email, addressline1, addressline2, city, state, country, pincode, setDefault } = req.body;
        const userId = req.session.userId;
        if (!userId) {
            req.flash('error', "User not logged in");
            return res.redirect('/login');
        }

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
                status: true,
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
        const userId = req.session.userId;
        const user = await User.findById(userId)
        const currentPage = 'profile';
        const categories = await Category.find({ status: true }).limit(3)
        const pass = req.flash('pass')
        const itemCount = req.session.cartCount;
        res.render('user/profile/changePassword', { user, currentPassword: pass, itemCount, categories, currentPage })
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const userId = req.session.userId
        const user = await User.findOne({ _id: userId })

        if (!user.password) {
            req.flash('pass', 'You signed up with Google, try to set password through forgot password!');
            return res.redirect('/resetpassword');
        }
        const isPassword = await bcrypt.compare(newPassword, user.password)
        if (isPassword) {
            req.flash('pass', 'Enter Different Password')
            return res.redirect('/resetpassword');
        }
        const passwordmatch = await bcrypt.compare(currentPassword, user.password)
        if (passwordmatch) {
            const hashedpassword = await bcrypt.hash(newPassword, 10)
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


const loadOrderList = asyncHandler(async (req, res) => {

    const userId = req.session.userId;
    const user = await User.findById(userId);
    //console.log(user);
    // Find orders for the specific user

    const order = await Order.find({ userId }).sort({ createdAt: -1 })
        .populate({
            path: 'items.productId'
        });
    //console.log("OrderlistController all Orders:  ",order)

    // const orderItems = await Promise.all(order.items.map(async (item) => {
    //     const product = item.productId;
    //     if (!product) {
    //         console.log('Product not found for item:', item);
    //         return null;
    //     }

    //     // Check if product.image is an array and has at least one element
    //     let imageUrls = [];
    //     if (Array.isArray(product.image) && product.image.length > 0) {
    //         imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
    //     } else {
    //         console.log('Product image is not defined or empty for product:', product);
    //     }

    //     return {
    //         ...item._doc,
    //         product: product._doc,
    //         imageUrls,
    //         total: product.price * item.quantity
    //     };
    // }));

    //console.log(order);

    // Render the orders page with the user's orders
    res.render("user/profile/orderList", { order, user });
});

// const cancelOrder = asyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const update = await Order.updateOne({ orderId: id}, { status: "cancelled", updated: new Date() })
//     if(!update){
//         req.flash(error, "Order not found")

//     }

//     const order = await Order.findOne({orderId:id})
//     const items = order.items.map(item => ({
//         productId: item.productId,
//         quantity: item.quantity,
//     }))
//     //console.log(items);

//         for(const item of items){
//             const product = await Product.findOne({_id:item.productId})
//             console.log("product : " + product)
//             product.stock += item.quantity
//             await product.save()
//         }
//         res.redirect('/profile/orders')
// })
const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id
        const update = await Order.updateOne({orderId: id }, { status: "Cancelled", updated: new Date() })
        const result = await Order.findOne({ orderId: id })

        if (result.payment == 'upi' || result.payment == 'wallet') {
            const userId = req.session.userId
            const user = await User.findOne({ _id: userId })
            user.wallet += parseInt(result.amount)
            await user.save()

            const wallet = await Wallet.findOne({ userId: userId })
            if (!wallet) {
                const newWallet = new Wallet({
                    userId: userId,
                    history: [
                        {
                            transaction: "Credited",
                            amount: result.amount,
                            date: new Date(),
                            reason: "Order Cancelled"
                        }
                    ]
                })
                await newWallet.save();
            } else {
                wallet.history.push({
                    transaction: "Credited",
                    amount: result.amount,
                    date: new Date(),
                    reason: "Order Cancelled"
                })
                await wallet.save();
            }
        }

        const items = result.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,

        }))

        for (const item of items) {
            const product = await Product.findOne({ _id: item.productId })
            product.stock += item.quantity
            await product.save()
        }
        res.redirect("/profile")
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const cancelProduct = asyncHandler(async (req, res) => {
    const orderId = req.params.orderId;
    const productId = req.params.productId;

    // Find the order and the product within it
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
        req.flash('error', 'Order not found');
        return res.redirect('/profile/orders');
    }

    const productItem = order.items.find(item => item.productId.toString() === productId.toString());
    if (!productItem) {
        req.flash('error', 'Product not found in the order');
        return res.redirect('/profile/orders');
    }

    // Update order status and remove the product item
    order.status = 'Cancel requested';
    order.updatedAt = new Date();

    // Remove the product from order items and adjust stock
    order.items = order.items.filter(item => item.productId.toString() !== productId.toString());

    // Save updated order
    await order.save();

    // Increase the stock of the cancelled product
    const product = await Product.findOne({ _id: productId });
    if (product) {
        product.stock += productItem.quantity;
        await product.save();
    }

    res.redirect('/profile/orders');
});

const returnReason = async (req, res) => {
    try {
        const itemId =  req.params.orderId;
        const reason = req.body.reason;
        console.log("Body of the return", req.body)
        const update = await Order.updateOne(
            { orderId: itemId },
            { 
                $push: { 
                    return: { 
                        reason: reason, 
                        status: "Return requested" 
                    } 
                }, 
                $set: { 
                    updated: new Date() 
                } 
            }
        );
        res.status(200).json({ message: 'Order return request processed successfully' });
        console.log("Return Update: ",update)
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("orderId for Invoice: ", orderId);
        const order = await Order.findOne({ orderId: orderId }).populate({
            path: 'items.productId',
            select: 'name description',
        });

        // Generate the PDF document
        const pdfBuffer = await generateInvoice(order);

        // Set response headers and send the PDF buffer
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
}

const generateInvoice = async (order) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // Document Title
            doc.fontSize(25).text('Invoice', { align: 'center' });

            // Invoice Details
            doc.fontSize(12).text(`Invoice Number: INV-${order.orderId}`, { align: 'left' });
            doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'left' });

            // Sender Information
            doc.moveDown().fontSize(12).text('Sender:', { bold: true });
            doc.text(`Company: Mahabali`);
            doc.text(`Address: HSR layout, Bengaluru, India`);
            doc.text(`Zip: 560101`);
            doc.text(`City: Bengaluru`);
            doc.text(`Country: INDIA`);
            doc.text(`Phone: 83103693966`);
            doc.text(`Email: mahabalistore@gmail.com`);
            doc.text(`Website: www.mahabali.com`);

            // Items Table Header
            doc.moveDown().fontSize(12).text('Items:', { bold: true });
            doc.moveDown();
            const tableTop = doc.y;
            const tableLeft = doc.x;
            const col1Width = 300;
            const col2Width = 100;
            const col3Width = 100;

            doc.text('Description', tableLeft, tableTop, { bold: true });
            doc.text('Quantity', tableLeft + col1Width, tableTop, { bold: true });
            doc.text('Price', tableLeft + col1Width + col2Width, tableTop, { bold: true });

            // Items Table Rows
            order.items.forEach((item, index) => {
                const rowTop = tableTop + 20 + (index * 20);
                doc.text(item.productId.name, tableLeft, rowTop);
                doc.text(item.quantity.toString(), tableLeft + col1Width, rowTop);
                doc.text(`₹${item.price.toFixed(2)}`, tableLeft + col1Width + col2Width, rowTop);
            });

            // Move to the next line after the table
            doc.moveDown();

            // Reset the x position to the left margin
            doc.x = 72; // Default left margin in PDFKit

            // Total Amount
            doc.fontSize(12).text(`Total: ₹${order.amount.toFixed(2)}`, {
                bold: true,
                align: 'left',
            });

            // Closing
            doc.moveDown().fontSize(12).text('Thank you for shopping at Mahabali!', {
                align: 'left',
            });

            // Finalize the PDF and end the stream
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const loadWallet = async (req, res) => {
    try {
        const currentPage = 'profile';
        const userId = req.session.userId;
        const categories = await Category.find()
        const user = await User.findOne({ _id: userId })
        const wallet = await Wallet.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$history" },
            { $sort: { "history.date": -1 } }
        ]);
      const itemCount = req.session.cartCount;
        res.render('user/profile/wallet', { wallet: wallet, user: user,itemCount, categories,title:"Mahabali - Wallet",currentPage })
    } catch (error) {
        console.log(error)
        res.render('user/servererror')
    }
}

const walletTopup = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findOne({ _id: userId })
        const Amount = parseFloat(req.body.Amount)
        let wallet = await Wallet.findOne({ userId: userId });
       
        if (!wallet) {
            wallet = new Wallet({ userId: userId, history: [] });
        }

        user.wallet += Amount;
        wallet.history.push({
            transaction: "Credited",
            amount: Amount,
            date: new Date(),
            reason: "Wallet TopUp"
        });

        await wallet.save();
        await user.save();
        res.redirect("/profile/wallet")
    } catch (error) {
        console.error('Error handling Razorpay callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const reOrder = async (req, res) => {

    console.log("Reaching Re-order Function ");

    try {
        const orderIdParams = req.params.id;
        console.log("orderIdParams",orderIdParams)
        const orderId = orderIdParams.trim();
        console.log("orderId",orderId)

        const userId = req.session.userId;
        const order = await Order.findOne({ orderId: orderId });
        console.log("order",order)
        const { pay, amount } = req.body;
        console.log("Req.body", req.body)
        const parsedWallet = parseInt(amount);
        if (pay == 'Payment pending') {
            res.redirect(`checkout/order-status/${order._id}`)
        } else if (pay == 'wallet') {
            const update = await Order.updateOne({ orderId: orderId }, {
                wallet: parsedWallet,
                payment: pay,
                status: "Pending",
                updated: new Date()
            })
            const userWallet = await Wallet.findOne({ userId: userId })
            userWallet.history.push({
                transaction: "Debited",
                amount: parsedWallet,
                date: new Date(),
                reason: "Product Purchased"
            })
            await userWallet.save();
            const user = await User.findOne({ _id: userId })
            user.wallet -= parsedWallet;
            await user.save();
        } else {
            const update = await Order.updateOne({ orderId: orderId }, {
                payment: pay,
                status: "pending",
                updated: new Date()
            })
        }
        req.flash('orderSuccess', 'Your Order is Successfull!')
        res.redirect(`/profile/orders`)
    } catch (error) {
        console.log(error);
        res.render('user/servererror');
    }
}

module.exports = {
    setDefaultAddress,
    LoadProfile,
    updateProfile,
    LoadAddAddress,
    addAddress,
    showaddress,
    LoadEditAddress,
    editaddress,
    deleteAddress,
    LoadResetPassword,
    updatePassword,
    loadOrderList,
    cancelOrder,
    cancelProduct,
    downloadInvoice,
    loadWallet,
    walletTopup,
    returnReason,
    reOrder,
}