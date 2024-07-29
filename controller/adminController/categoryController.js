const asyncHandler = require('../../middleware/asyncHandler');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');



const loadCategory = asyncHandler(async (req, res) => {
    const successMessage = req.flash('success');
    const errorMessages = req.flash('error');
    const category = await Category.find({});
    res.render('admin/adminCategory', { category, successMessage, errorMessages});

})

// const loadAddCategory = asyncHandler(async (req, res) => {
//     const successMessage = req.flash('Success');
//     const category = await Category.find({});
//     res.render('admin/adminCategory-add', { category, successMessage });
// })


//post
const addNewCategory = asyncHandler(async (req, res) => {
    const { name, description, discount } = req.body;

    // Validate required fields
    if (!name || !description) {
        req.flash("error", "Please fill in all required fields");
        return res.redirect("/admin/category");
    }

    try {
        // Create the normalized category name
        const normalizedCategoryName = name.toLowerCase();

        // Check if a category with the same normalized name already exists
        const existingCategory = await Category.findOne({ normalized_name: normalizedCategoryName });
        if (existingCategory) {
            req.flash("error", "Category name already exists");
            return res.redirect("/admin/category");
        }

        // Create the new category with the desired casing and normalized name
        const newCategory = new Category({
            name,  // Store the desired casing
            normalized_name: normalizedCategoryName,  // Store the normalized name
            description,
            discount
        });

        await newCategory.save();
        req.flash('success', 'Category Added Successfully!');
        res.redirect('/admin/category');
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            req.flash("error", "Category name already exists");
        } else {
            req.flash("error", "An error occurred while adding the category");
        }
        res.redirect("/admin/category");
    }
});





const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, discount } = req.body;
    console.log("Reaching UpdateCategory")
    const id = req.params.id;
    console.log("Id: ",id)


    try {
        const category = await Category.findById(id);
        if (!category) {
            req.flash('error', "Category does not exist");
            return res.redirect('/admin/category');
        }

        // Create the normalized category name
        const normalizedCategoryName = name.trim().toLowerCase();
        console.log("normalizedCategoryName: ",normalizedCategoryName)

        // Check if a category with the same normalized name already exists
        const existingCategory = await Category.findOne({ normalized_name: normalizedCategoryName });
        if (existingCategory) {
            req.flash("error", "Category name already exists");
            return res.redirect("/admin/category");
        }

        // Initialize an empty object to hold the fields to update
        const updates = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (discount) updates.discount = discount;

        // Check if there are updates to apply
        if (Object.keys(updates).length === 0) {
            req.flash("error", "No fields to update");
            return res.redirect(`/admin/category/edit/${id}`);
        }

        // Update the category
        await Category.findByIdAndUpdate(id, { $set: updates });

        req.flash('success', 'Category updated successfully');
        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category:', error);
        req.flash('error', 'Failed to update category');
        res.redirect(`/admin/category/`);
    }
});




const listingStatusCategory = asyncHandler(async (req, res) => {

    const id = req.query.id;
    console.log("Received ID:", id);
    const category = await Category.findById(id);
    category.isListed = !category.isListed;
    await category.save();
    req.flash('success', "Category status updated successfully")
    res.redirect('/admin/category',)
}
)

module.exports = {
    loadCategory,
    addNewCategory,
    updateCategory,
    listingStatusCategory,
   
}