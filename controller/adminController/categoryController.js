const asyncHandler = require('../../middleware/asyncHandler');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');



const loadCategory = asyncHandler(async (req, res) => {
    const successMessage = req.flash('Success');
    const category = await categoryCollection.find({});
    res.render('admin/adminCategory', { category, successMessage });

})

const loadaddCategory = asyncHandler(async (req, res) => {
    const successMessage = req.flash('Success');
    const category = await categoryCollection.find({});
    res.render('admin/adminCategory-add', { category, successMessage });
})

const addNewCategory = asyncHandler(async (req, res) => {
    const { name, description, discount } = req.body;

    const existingCategory = await Category.findone({ name });
    //if the category already exists??
    if (existingCategory) {
        req.flash("error", "Category name already exists")
        return res.redirect("/add-category")
    } else {
        //if the required fields are blank??
        if (!name || !description || !discount) {
            req.flash("error", "Please fill in all required fields");
            return res.redirect("/add-category");

        }
    }
    await Category.create({ name: name, description: description, discount: discount });
    req.flash('success', 'Category Added Successfully!');
    res.redirect('/admin/categories');
})

const loadUpdateCategory = asyncHandler(async (req, res) => {

})

const updateCategory = asyncHandler(async (req, res) => {
    const { name, description, discount } = req.body;
    const id = req.params.id;
    
    try {
        const category = await Category.findById(id);
        if (!category) {
            req.flash('error', "Category does not exist");
            return res.redirect('/admin/categories');
        }

        // Initialize an empty object to hold the fields to update
        const updates = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (discount) updates.discount = discount;

        // Check if there are updates to apply
        if (Object.keys(updates).length === 0) {
            req.flash("error", "No fields to update");
            return res.redirect(`/admin/categories/edit/${id}`);
        }

        // Update the category
        await Category.findByIdAndUpdate(id, { $set: updates });

        req.flash('success', 'Category updated successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error updating category:', error);
        req.flash('error', 'Failed to update category');
        res.redirect(`/admin/categories/edit/${id}`);
    }
});




const unlistCategory = asyncHandler(async (req, res) => {
    //if it is already unlisted
    const id = req.params.id;
    const category = await Category.findByID(id);
    if (!category) {
        req.flash('error', "Category does not Exists");
        return res.redirect('/category')
    } else {
        category.isListed = !category.isListed;
        await category.save();
        req.flash('sucess', "Categpry status updated successfully")
        res.redirect('/category',)
    }
})

module.exports = {
    loadCategory,
    loadaddCategory,
    loadUpdateCategory,
    addNewCategory,
    updateCategory,
    unlistCategory
}