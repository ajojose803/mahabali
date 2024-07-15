
const bcrypt = require('bcryptjs')
const User = require('../../model/userModel');
const asyncHandler = require("../../middleware/asyncHandler");
const Product = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');
const puppeteer =  require('puppeteer')
const { getObjectSignedUrl } = require('../../utils/s3');
const exceljs = require('exceljs');
const path = require('path');
const fs = require('fs');
const os = require('os');


const adminPage = asyncHandler((req, res) => {
    if (req.session.isAdAuth) {
        res.redirect('/admin/dashboard')
    }
    const errorMessages = req.flash("error");
    res.render('admin/adminLogin', { errorMessages })
})

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await User.findOne({ email });
    if (!admin) {
        req.flash("error", "User not found");
        return res.redirect("/admin/login");
    }

    const passCheck = await bcrypt.compare(password, admin.password);
    if (!passCheck) {
        req.flash("error", "Invalid Credentials");
        return res.redirect("/admin/login");
    }

    if (admin.isAdmin == true) {
        req.session.admin = email;
        req.session.isAdAuth = true;
        return res.redirect('/admin/dashboard');
    } else {
        req.flash('error', 'You are not an Admin!')
        return res.redirect('/admin/login')
    }
})


const adminDashboard = asyncHandler(async (req, res) => {
    const userCount = await User.countDocuments({});
    const perPage = 3;
    const page = parseInt(req.query.page) || 1;
    const products = await Order.aggregate([
        {
            $match: {
                status: "delivered"
            }
        },
        {
            $unwind: '$items',
        },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productDetails',
            },
        },
        {
            $unwind: '$productDetails',
        },
        {
            $group: {
                _id: '$items.productId',
                totalSold: { $sum: '$items.quantity' },
                totalPrice: { $sum: { $multiply: ['$items.quantity', '$productDetails.price'] } },
                totalDiscountPercent: { $first: '$productDetails.discount' },
                productName: { $first: '$productDetails.name' },
                productImage: { $first: '$productDetails.image' },
            },
        },
        {
            $addFields: {
                totalDiscount: { $multiply: ['$totalPrice', { $divide: ['$totalDiscountPercent', 100] }] },
            },
        },
        {
            $sort: { totalSold: -1 },
        },
    ]);

    // Generate signed URLs for images
    for (const product of products) {
        if (product.productImage && Array.isArray(product.productImage)) {
            product.imageUrls = await Promise.all(product.productImage.map(async (image) => {
                const url = await getObjectSignedUrl(image);
                //console.log(`Generated URL for ${image}: ${url}`);
                return url;
            }));
        } else {
            product.imageUrls = [];
        }
    }

    let totalDiscountSum = 0;
    products.forEach(product => {
        totalDiscountSum += product.totalDiscount;
    });

    const orders = await Order.aggregate([
        {
            $match: {
                status: {
                    $nin: ["Cancelled", "returned"]
                }
            },
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
            },
        },
    ]);

    const totalPages = Math.ceil(products.length / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = page * perPage;
    const productsPaginated = products.slice(startIndex, endIndex);
    const errorMessages = req.flash('error');
    
    res.render('admin/adminHome', { 
        errorMessages, 
        userCount, 
        products: productsPaginated, 
        currentPage: page, 
        totalPages, 
        orders, 
        totalDiscountSum 
    });
});


const adminLogout = asyncHandler(async (req, res) => {
    req.session.isAdAuth = false;
    req.session.admin = null;
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
})

const chartData = async (req, res) => {
    try {
        const selected = req.body.selected;
        
        if (selected == 'month') {
            const orderByMonth = await Order.aggregate([
              {
                $match: {
                            status: "delivered"       
                }
            },
            {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ])
            const salesByMonth = await Order.aggregate([
              {
                $match: {
                            status: "delivered"       
                }
            },
             {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
  
                        totalAmount: { $sum: '$amount' },
  
                    }
                }
            ])
            
            const responseData = {
                order: orderByMonth,
                sales: salesByMonth
            };
  
  
            res.status(200).json(responseData);
        }
        else if (selected == 'year') {
            const orderByYear = await Order.aggregate([
              {
                $match: {
                            status: "delivered"       
                }
            },
             {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ])
            const salesByYear = await Order.aggregate([
              {
                $match: {
                            status: "delivered"       
                }
            },
            {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ])
           
            const responseData = {
                order: orderByYear,
                sales: salesByYear,
            }
            res.status(200).json(responseData);
        }
  
    }
    catch (err) {
        console.log(err);
        res.send("Error Occured")
    }
  
  }
  
  
  const isFutureDate = (selectedDate) => {
    try {
        const selectedDateTime = new Date(selectedDate);
        const currentDate = new Date();
        return selectedDateTime > currentDate;
  
    } catch (error) {
        console.log(error);
        res.render("users/servererror") 
    }
  }
  
  const downloadsales = async (req, res) => {
    try {
        console.log("Reaching Download Sales")
        
        const { startDate, endDate, submitBtn } = req.body;
        console.log("req.body: ", req.body);
  
        let sdate = isFutureDate(startDate);
        let edate = isFutureDate(endDate);
  
        if (!startDate || !endDate) {
            req.flash('error', 'Choose a date');
            return res.redirect('/admin/dashboard');
        }
        if (sdate) {
            req.flash('error', 'Invalid date');
            return res.redirect('/admin/dashboard');
        }
        if (edate) {
            req.flash('error', 'Invalid date');
            return res.redirect('/admin/dashboard');
        }
  
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate),
                    },
                    status: {
                        $nin: ["Cancelled", "returned"]
                    }
                },
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }, 
                },
            },
        ]);
  
        const products = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate),
                    },
                    status: {
                        $nin: ["Cancelled", "returned"]
                    }
                },
            },
            {
                $unwind: '$items',
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                },
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails',
                },
            },
            {
                $unwind: '$productDetails',
            },
            {
                $project: {
                    _id: 1,
                    totalSold: 1,
                    productName: '$productDetails.description',
                },
            },
            {
                $sort: { totalSold: -1 },
            },
        ]);

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sales Report</title>
            <style>
                body {
                    margin-left: 20px;
                }
            </style>
        </head>
        <body>
            <h2 align="center"> Sales Report</h2>
            Start Date:${startDate}<br>
            End Date:${endDate}<br> 
            <center>
                <table class="mt-5" style="border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px;">Sl N0</th>
                            <th style="border: 1px solid #000; padding: 8px;">Product Name</th>
                            <th style="border: 1px solid #000; padding: 8px;">Quantity Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products
                            .map(
                                (item, index) => `
                                <tr>
                                    <td style="border: 1px solid #000; padding: 8px;">${index + 1}</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${item.productName}</td>
                                    <td style="border: 1px solid #000; padding: 8px;">${item.totalSold}</td>
                                </tr>`
                            )
                            .join("")}
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px;"></td>
                            <td style="border: 1px solid #000; padding: 8px;">Total No of Orders</td>
                            <td style="border: 1px solid #000; padding: 8px;">${salesData[0]?.totalOrders || 0}</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px;"></td>
                            <td style="border: 1px solid #000; padding: 8px;">Total Revenue</td>
                            <td style="border: 1px solid #000; padding: 8px;">${salesData[0]?.totalAmount || 0}</td>
                        </tr>
                    </tbody>
                </table>
            </center>
        </body>
        </html>
    `;

    if (submitBtn == 'pdf') {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 60000 // Increase timeout to 60 seconds
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf();
        await browser.close();

        const downloadsPath = path.join(os.homedir(), 'Downloads');
        const pdfFilePath = path.join(downloadsPath, 'sales.pdf');

        fs.writeFileSync(pdfFilePath, pdfBuffer);

        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales.pdf');
        res.status(200).end(pdfBuffer);
    } else {
        const totalAmount = salesData[0]?.totalAmount || 0;
        const workbook = new exceljs.Workbook();
        const sheet = workbook.addWorksheet("Sales Report");
        sheet.columns = [
            { header: "Sl No", key: "slNo", width: 10 },
            { header: "Product Name", key: "productName", width: 25 },
            { header: "Quantity Sold", key: "productQuantity", width: 15 },
        ];
        products.forEach((item, index) => {
            sheet.addRow({
                slNo: index + 1,
                productName: item.productName,
                productQuantity: item.totalSold,
            });
        });
        sheet.addRow({});
        sheet.addRow({ productName: 'Total No of Orders', productQuantity: salesData[0]?.totalOrders || 0 });
        sheet.addRow({ productName: 'Total Revenue', productQuantity: totalAmount });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment;filename=report.xlsx");
        await workbook.xlsx.write(res);
    }
    } catch (err) {
        console.error(err);
        res.render("user/servererror");
    }
};

  const bestSellingProduct = async (req, res) => {
    try {
  
      const bestSellingProducts = await Order.aggregate([
        {
          $match: {
            status: {
              $nin: ["Cancelled", "returned"]
            }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $unwind: '$productDetails'
        },
        {
          $group: {
            _id: '$productDetails.description',
            totalSales: { $sum: '$items.quantity' },
            productName: { $first: '$productDetails.description' }
          }
        },
        {
          $sort: { totalSales: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: 1,
            totalSales: 1
          }
        }
      ]);
      
  
        res.status(200).json({bestSellingProducts,item:'Product'})
      
  
    } catch (error) {
  
        console.log("error in best selling product",error)
  
  
    }
  }
  
  const bestSellingCategories=async(req,res)=>{
    try {
        
      const bestSellingCategories = await Order.aggregate([
        {
            $unwind: "$items"
        },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        {
            $unwind: "$productDetails"
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'productDetails.category',
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        {
            $unwind: "$categoryDetails"
        },
        {
            $group: {
                _id: {
                    categoryId: "$categoryDetails._id",
                    categoryName: "$categoryDetails.name"
                },
                totalSales: { $sum: "$items.quantity" }
            }
        },
        {
            $sort: { totalSales: -1 }
        },
        {
            $limit: 10
        },
        {
            $project: {
                _id: 0,
                categoryId: "$_id.categoryId",
                categoryName: "$_id.categoryName",
                totalSales: 1
            }
        }
    ]);
  
        res.status(200).json({bestSellingCategories,item:'Category'})
      
  
    } catch (error) {
  
        console.log("error in best selling product",error)
  
  
    }
  }


module.exports =
{
    adminPage,
    adminLogin,
    adminDashboard,
    adminLogout,
    bestSellingCategories,
    bestSellingProduct,
    downloadsales,
    chartData,

}