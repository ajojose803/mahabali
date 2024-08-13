
const bcrypt = require('bcryptjs')
const User = require('../../model/userModel');
const asyncHandler = require("../../middleware/asyncHandler");
const Order = require('../../model/orderModel');
const { getObjectSignedUrl } = require('../../utils/s3');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PDFDocument = require('pdfkit');


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

        if (selected === 'month') {
            // Monthly data
            const orderByMonth = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ]);
            const salesByMonth = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ]);

            const responseData = {
                order: orderByMonth,
                sales: salesByMonth
            };
            res.status(200).json(responseData);

        } else if (selected === 'year') {
            // Yearly data
            const orderByYear = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        count: { $sum: 1 },
                    }
                }
            ]);
            const salesByYear = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                }
            ]);

            const responseData = {
                order: orderByYear,
                sales: salesByYear,
            };
            res.status(200).json(responseData);

        } else if (selected === 'week') {
            // Weekly data
            const orderByWeek = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            week: { $isoWeek: '$createdAt' }
                        },
                        count: { $sum: 1 },
                    }
                },
                { $sort: { '_id.year': 1, '_id.week': 1 } }
            ]);
            const salesByWeek = await Order.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            week: { $isoWeek: '$createdAt' }
                        },
                        totalAmount: { $sum: '$amount' },
                    }
                },
                { $sort: { '_id.year': 1, '_id.week': 1 } }
            ]);

            const responseData = {
                order: orderByWeek,
                sales: salesByWeek,
            };
            res.status(200).json(responseData);
        }

    } catch (err) {
        console.log(err);
        res.status(500).send("Error Occurred");
    }
};

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
        console.log("Reaching Download Sales");

        const { startDate, endDate, dateFilter, submitBtn } = req.body;
        console.log("req.body: ", req.body);

        let sdate = isFutureDate(startDate);
        let edate = isFutureDate(endDate);

        if (!startDate && !endDate && !dateFilter) {
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

        // Determine the date range based on the filter type
        let filterStartDate = startDate;
        let filterEndDate = endDate;

        if (dateFilter) {
            const now = new Date();
            if (dateFilter === 'weekly') {
                filterStartDate = new Date(now.setDate(now.getDate() - now.getDay())); // Start of the week
                filterEndDate = new Date(now.setDate(now.getDate() + (6 - now.getDay()))); // End of the week
            } else if (dateFilter === 'monthly') {
                filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
                filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of the month
            } else if (dateFilter === 'yearly') {
                filterStartDate = new Date(now.getFullYear(), 0, 1); // Start of the year
                filterEndDate = new Date(now.getFullYear(), 11, 31); // End of the year
            }
        }

        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(filterStartDate),
                        $lt: new Date(new Date(filterEndDate).setDate(new Date(filterEndDate).getDate() + 1)),
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
                        $gte: new Date(filterStartDate),
                        $lt: new Date(new Date(filterEndDate).setDate(new Date(filterEndDate).getDate() + 1)),
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
                    totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
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
                    totalRevenue: 1,
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
          Start Date:${filterStartDate}<br>
          End Date:${filterEndDate}<br> 
          <center>
              <table class="mt-5" style="border-collapse: collapse;">
                  <thead>
                      <tr>
                          <th style="border: 1px solid #000; padding: 8px;">Sl No</th>
                          <th style="border: 1px solid #000; padding: 8px;">Product Name</th>
                          <th style="border: 1px solid #000; padding: 8px;">Quantity Sold</th>
                          <th style="border: 1px solid #000; padding: 8px;">Revenue</th>
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
                                  <td style="border: 1px solid #000; padding: 8px;">${item.totalRevenue}</td>
                              </tr>`
                )
                .join("")}
                      <tr>
                          <td style="border: 1px solid #000; padding: 8px;"></td>
                          <td style="border: 1px solid #000; padding: 8px;">Total No of Orders</td>
                          <td style="border: 1px solid #000; padding: 8px;">${salesData[0]?.totalOrders || 0}</td>
                          <td style="border: 1px solid #000; padding: 8px;"></td>
                      </tr>
                      <tr>
                          <td style="border: 1px solid #000; padding: 8px;"></td>
                          <td style="border: 1px solid #000; padding: 8px;">Total Revenue</td>
                          <td style="border: 1px solid #000; padding: 8px;"></td>
                          <td style="border: 1px solid #000; padding: 8px;">${salesData[0]?.totalAmount || 0}</td>
                      </tr>
                  </tbody>
              </table>
          </center>
      </body>
      </html>
  `;

        if (submitBtn === 'pdf') {
            const pdfPath = path.join(__dirname, 'sales_report.pdf');
            const doc = new PDFDocument({
                margin: 20,
                size: 'A4'
            });
            const stream = fs.createWriteStream(pdfPath);

            doc.pipe(stream);

            // Helper function to format date
            const formatDate = (dateString) => {
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? dateString : date.toDateString();
            };

            // Helper function to check if we need a new page
            const checkNewPage = (y, height) => {
                if (y + height > doc.page.height - 20) {
                    doc.addPage();
                    return 20;
                }
                return y;
            };

            // Improved helper function to wrap text
            const wrapText = (text, width) => {
                const words = text.split(/\s+/);
                const lines = [];
                let currentLine = '';

                words.forEach(word => {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    if (doc.widthOfString(testLine) <= width) {
                        currentLine = testLine;
                    } else {
                        if (currentLine.endsWith('.')) {
                            lines.push(currentLine);
                            currentLine = word;
                        } else {
                            if (doc.widthOfString(word) > width) {
                                let partialWord = '';
                                for (let char of word) {
                                    if (doc.widthOfString(partialWord + char) <= width) {
                                        partialWord += char;
                                    } else {
                                        lines.push(partialWord + '-');
                                        partialWord = char;
                                    }
                                }
                                currentLine = partialWord;
                            } else {
                                lines.push(currentLine);
                                currentLine = word;
                            }
                        }
                    }
                });
                if (currentLine) {
                    lines.push(currentLine);
                }
                return lines;
            };

            // Add content to PDF
            doc.fontSize(16).text('Sales Report', { align: 'center' });
            let y = 60;
            doc.fontSize(10).text(`Start Date: ${formatDate(filterStartDate)}`, 20, y);
            y += 15;
            doc.text(`End Date: ${formatDate(filterEndDate)}`, 20, y);
            y += 30;

            // Create table
            const table = {
                headers: ['Sl No', 'Product Name', 'Quantity Sold', 'Revenue'],
                rows: products.map((item, index) => [
                    index + 1,
                    item.productName,
                    item.totalSold,
                    item.totalRevenue.toFixed(2)
                ])
            };

            // Table configuration
            const startX = 20;
            const baseRowHeight = 20;
            const lineSpacing = 5;  // Added line spacing
            const colWidths = [40, 300, 80, 120];
            const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);

            // Draw headers
            y = checkNewPage(y, baseRowHeight + lineSpacing);
            doc.font('Helvetica-Bold').fontSize(10);
            table.headers.forEach((header, i) => {
                doc.text(header,
                    startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0),
                    y,
                    { width: colWidths[i], align: i === 0 ? 'center' : i === 1 ? 'left' : 'right' }
                );
            });

            // Draw rows
            y += baseRowHeight + lineSpacing;
            doc.font('Helvetica').fontSize(9);
            table.rows.forEach((row, rowIndex) => {
                const wrappedProductName = wrapText(row[1], colWidths[1] - 5);
                const rowHeight = Math.max(baseRowHeight, wrappedProductName.length * 14);

                y = checkNewPage(y, rowHeight + lineSpacing);

                // Draw Sl No
                doc.text(row[0].toString(), startX, y, { width: colWidths[0], align: 'center' });

                // Draw Product Name (wrapped)
                let productNameY = y;
                wrappedProductName.forEach(line => {
                    doc.text(line, startX + colWidths[0], productNameY, { width: colWidths[1], align: 'left' });
                    productNameY += 14;
                });

                // Draw Quantity Sold
                doc.text(row[2].toString(), startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });

                // Draw Revenue
                doc.text(row[3].toString(), startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });

                y += rowHeight + lineSpacing;

                // Draw line after each row
                doc.moveTo(startX, y - lineSpacing / 2).lineTo(startX + tableWidth, y - lineSpacing / 2).stroke();
            });

            // Add total information
            y = checkNewPage(y, baseRowHeight * 3);
            y += baseRowHeight;
            doc.font('Helvetica-Bold').fontSize(10);
            doc.text(`Total No of Orders: ${salesData[0]?.totalOrders || 0}`, startX, y);
            y += baseRowHeight;
            doc.text(`Total Revenue: ${salesData[0]?.totalAmount?.toFixed(2) || '0.00'}`, startX, y);

            doc.end();

            stream.on('finish', () => {
                res.download(pdfPath, 'sales_report.pdf', (err) => {
                    if (err) {
                        console.error("Error sending PDF:", err);
                        req.flash('error', 'An error occurred while sending the PDF');
                        res.redirect('/admin/dashboard');
                    } else {
                        fs.unlinkSync(pdfPath); // Remove the file after sending
                    }
                });
            });
        }
        else if (submitBtn === 'excel') {
            const workbook = new excel.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            worksheet.columns = [
                { header: 'Sl No', key: 'slno', width: 10 },
                { header: 'Product Name', key: 'productName', width: 30 },
                { header: 'Quantity Sold', key: 'quantitySold', width: 20 },
                { header: 'Revenue', key: 'revenue', width: 20 },
            ];

            products.forEach((item, index) => {
                worksheet.addRow({
                    slno: index + 1,
                    productName: item.productName,
                    quantitySold: item.totalSold,
                    revenue: item.totalRevenue
                });
            });

            worksheet.addRow([]);
            worksheet.addRow({
                productName: 'Total No of Orders',
                quantitySold: salesData[0]?.totalOrders || 0
            });
            worksheet.addRow({
                productName: 'Total Revenue',
                revenue: salesData[0]?.totalAmount || 0
            });

            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
            await workbook.xlsx.write(res);
            res.end();
        }
    } catch (error) {
        console.error("Error while downloading sales:", error);
        req.flash('error', 'An error occurred while generating the report');
        res.redirect('/admin/dashboard');
    }
};


const bestSellingProduct = async (req, res) => {
    try {
        console.log("Reaching Best seelling ProD")

        const bestSellingProducts = await Order.aggregate([
            {
                $match: {
                    status: {
                        $nin: ["Cancelled", "Returned"]
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
                    _id: '$productDetails.name',
                    totalSales: { $sum: '$items.quantity' },
                    productName: { $first: '$productDetails.name' }
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

        //   console.log("Best Selling Product: ",bestSellingProducts)

        res.status(200).json({ bestSellingProducts, item: 'Product' })


    } catch (error) {

        console.log("error in best selling product", error)


    }
}

const bestSellingCategories = async (req, res) => {
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

        res.status(200).json({ bestSellingCategories, item: 'Category' })


    } catch (error) {

        console.log("error in best selling product", error)


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