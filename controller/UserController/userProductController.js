const Product = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const asyncHandler = require('../../middleware/asyncHandler');
const { getObjectSignedUrl } = require('../../utils/s3');
const { render } = require('ejs');

const getAllProducts = asyncHandler(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const showOutOfStock = req.query.showOutOfStock === 'true';
        const sort = req.query.sort;
        const selectedCategory = req.query.category;
        const search = req.query.search || ''; // Capture the search query

        console.log("req.query.category : " + req.query.category);

        let query = { status: true };

        if (selectedCategory) {
            const category = await Category.findOne({ _id: selectedCategory });
            console.log("category: ", category);
            const categoryId = category._id;
            console.log(categoryId);

            query.category = categoryId;
            console.log("query.category: ", query.category);
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' }; 
        }

        if (!showOutOfStock) {
            query.$or = [
                { stock: { $gt: 0 } },
                {
                    $and: [
                        { productType: 'Apparels' },
                        { sizes: { $exists: true } },
                        { sizes: { $ne: {} } },
                        { $expr: { $gt: [{ $size: { $filter: { input: { $objectToArray: "$sizes" }, cond: { $gt: ["$$this.v", 0] } } } }, 0] } }
                    ]
                }
            ];
        }

        let sortCriteria = {};
        switch (sort) {
            case 'popularity':
                sortCriteria.viewCount = -1;
                break;
            case 'price-asc':
                sortCriteria.price = 1;
                break;
            case 'price-desc':
                sortCriteria.price = -1;
                break;
            case 'rating':
                sortCriteria.rating = -1;
                break;
            case 'new-arrivals':
                sortCriteria.createdAt = -1;
                break;
            case 'name-asc':
                sortCriteria.name = 1;
                break;
            case 'name-desc':
                sortCriteria.name = -1;
                break;
            default:
                sortCriteria.createdAt = -1;
                break;
        }

        const products = await Product.find(query)
            .populate('category')
            .skip(skip)
            .limit(limit)
            .sort(sortCriteria);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        for (const product of products) {
            product.imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
        }

        const categories = await Category.find({ isListed: true });
        console.log(categories);

        return res.render('user/products', {
            products,
            categories,
            user: req.user,
            currentPage: page,
            totalPages,
            limit,
            showOutOfStock,
            sort,
            selectedCategory,
            search // Pass the search variable to the template
        });
    } catch (error) {
        console.error('Error fetching all products:', error);
        res.redirect('/error');
    }
});



const getProductsByCategory = asyncHandler(async (req, res, category) => {
    try {
        const products = await Product.find({ category: category });

        if (!products.length) {
            return res.render('user/noProducts', { category });
        }

        return res.render('user/category', { products, category });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.redirect('/error');
    }
});

const getCoasters = asyncHandler(async (req, res) => {
    const category = 'Coasters'; // Adjust the category name as needed
    await getProductsByCategory(req, res, category);
});

const getPosters = asyncHandler(async (req, res) => {
    const category = 'Posters'; // Adjust the category name as needed
    await getProductsByCategory(req, res, category);
});

const getAccessories = asyncHandler(async (req, res) => {
    const category = 'Accessories'; // Adjust the category name as needed
    await getProductsByCategory(req, res, category);
});

const getApparels = asyncHandler(async (req, res) => {
    const category = 'Apparels'; // Adjust the category name as needed
    await getProductsByCategory(req, res, category);
});

const getProduct = asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product) {
        return res.status(404).send('Product not found');
    }

    // Fetch the related products based on the product category and limit to 4
    const relatedProducts = await Product.find({ category: product.category, _id: { $ne: productId } }).limit(4);

    // Add image URLs for related products
    for (const relatedProduct of relatedProducts) {
        relatedProduct.imageUrls = await Promise.all(relatedProduct.image.map(getObjectSignedUrl));
    }
    product.viewCount += 1;
    await product.save();

    // Add image URLs for the main product
    product.imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
    // console.log(product)
    res.render("user/productDetails", { product, relatedProducts, user: req.user });
});






module.exports = {
    getAllProducts,
    getProduct,
    getCoasters,
    getPosters,
    getAccessories,
    getApparels,
};
