const asyncHandler = require('../../middleware/asyncHandler');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');


const loadProduct = async (req, res) => {

    let page = +req.query.page || 1; 
    const ITEMS_PER_PAGE = 8;
    const totalProducts = await Product.countDocuments(); // Get total number of products
    let totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE); 

    // Adjust totalPages to at least 1 to prevent calculation errors when there are no products
    totalPages = Math.max(totalPages, 1);

    // Ensure the page number is within the valid range
    if (page < 1) {
        page = 1;
    } else if (page > totalPages) {
        page = totalPages;
    }

    // Calculate skip only after adjusting page and totalPages
    const skipAmount = Math.max(0, (page - 1) * ITEMS_PER_PAGE);

    // Find products with pagination
    const products = await Product
        .find()
        .skip(skipAmount)
        .limit(ITEMS_PER_PAGE);

    // Calculating previous and next page numbers
    let prev = page > 1 ? page - 1 : null;
    let next = page < totalPages ? page + 1 : null;

    let msg = req.query.msg || "";
    const category = await Category.find({});

    
    res.render("admin/adminProduct", {
        data: products,
        prev: prev,
        next: next,
        totalPages: totalPages,
        currentPage: page,
        CatData: category,
        msg: msg,
    });

}


const loadAddProduct = asyncHandler(async(req,res)=>{
    const category = await Category.find({});
    res.render('admin/adminProduct-add',{data: category})
})

const addNewProduct = asyncHandler(async(req,res) =>{

}) 

module.exports = {
    loadProduct,
    loadAddProduct
}


 