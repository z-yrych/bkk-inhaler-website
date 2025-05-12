import React, { useState, useEffect, FormEvent } from "react";
import { IProductData } from "@/types/productTypes"; // Plain data type for product
import { z } from "zod";
import {
  ProductCreationSchema,
  ProductUpdateSchema,
} from "@/lib/validators/productValidators"; // Assuming these exist

// Define props for the form
export interface ProductFormProps {
  initialData?: Partial<IProductData>; // For pre-filling the form in edit mode
  onSubmit: (data: Partial<IProductData>) => Promise<void>; // Data will be partial for update
  isSubmitting: boolean;
  submitButtonText?: string;
  formError?: string | null;
}

// Type for form state - allow numbers for price/stock initially for input ease
type ProductFormData = Omit<
  Partial<IProductData>,
  | "price"
  | "stockQuantity"
  | "images"
  | "scentProfile"
  | "benefits"
  | "ingredients"
> & {
  price: string; // Input as string, convert to cents on submit
  stockQuantity: string; // Input as string, convert to number on submit
  images: string[]; // Array of URL strings
  scentProfile: string; // Comma-separated string for input
  benefits: string; // Comma-separated string for input
  ingredients: string; // Comma-separated string for input
};

const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = "Submit Product",
  formError,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price:
      initialData?.price !== undefined
        ? (initialData.price / 100).toFixed(2)
        : "", // Convert cents to currency string
    stockQuantity:
      initialData?.stockQuantity !== undefined
        ? initialData.stockQuantity.toString()
        : "",
    images: initialData?.images || [""], // Start with one empty image URL input
    scentProfile: initialData?.scentProfile?.join(", ") || "",
    benefits: initialData?.benefits?.join(", ") || "",
    usageInstructions: initialData?.usageInstructions || "",
    ingredients: initialData?.ingredients?.join(", ") || "",
    isActive: initialData?.isActive === undefined ? true : initialData.isActive,
    slug: initialData?.slug || "", // Slug might be editable or just displayed
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});

  useEffect(() => {
    // Pre-fill form if initialData changes (e.g., when editing a product)
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        price:
          initialData.price !== undefined
            ? (initialData.price / 100).toFixed(2)
            : "",
        stockQuantity:
          initialData.stockQuantity !== undefined
            ? initialData.stockQuantity.toString()
            : "",
        images:
          initialData.images && initialData.images.length > 0
            ? initialData.images
            : [""],
        scentProfile: initialData.scentProfile?.join(", ") || "",
        benefits: initialData.benefits?.join(", ") || "",
        usageInstructions: initialData.usageInstructions || "",
        ingredients: initialData.ingredients?.join(", ") || "",
        isActive:
          initialData.isActive === undefined ? true : initialData.isActive,
        slug: initialData.slug || "",
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement) {
      const inputElement = e.target as HTMLInputElement; // Assert type here
      if (inputElement.type === "checkbox") {
        setFormData((prev) => ({ ...prev, [name]: inputElement.checked }));
      } else {
        // Handle other HTMLInputElement types like text, number, url, email etc.
        setFormData((prev) => ({ ...prev, [name]: inputElement.value }));
      }
    } else {
      // Handle HTMLTextAreaElement and HTMLSelectElement (they only have 'value')
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Image URL input management
  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData((prev) => ({ ...prev, images: [...prev.images, ""] }));
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, images: newImages }));
    } else {
      // If it's the last one, just clear it instead of removing the input field
      handleImageChange(index, "");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});

    const dataToValidate: Partial<IProductData> = {
      ...formData,
      price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
      stockQuantity: parseInt(formData.stockQuantity, 10),
      // Filter out empty image strings and trim
      images: formData.images
        .map((img) => img.trim())
        .filter((img) => img !== ""),
      // Split comma-separated strings into arrays, trim, and filter empty
      scentProfile: formData.scentProfile
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
      benefits: formData.benefits
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b !== ""),
      ingredients: formData.ingredients
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i !== ""),
    };

    // Remove fields that are empty strings if they are optional for update
    // For creation, schema handles required fields. For update, empty strings might not be intended as updates.
    // This logic depends on how ProductUpdateSchema is defined (if it allows undefined for optional fields)
    Object.keys(dataToValidate).forEach((keyStr) => {
      const key = keyStr as keyof typeof dataToValidate;
      if (
        dataToValidate[key] === "" &&
        key !== "description" &&
        key !== "usageInstructions"
      ) {
        // Allow empty description/usage
        // For optional array fields, if the source string was empty, it results in [''] which filter turns to []
        // This is usually fine.
        if (!Array.isArray(dataToValidate[key])) {
          delete dataToValidate[key];
        }
      }
    });
    if (isNaN(dataToValidate.price as number)) delete dataToValidate.price;
    if (isNaN(dataToValidate.stockQuantity as number))
      delete dataToValidate.stockQuantity;

    // Determine which schema to use based on whether it's an update (initialData has _id) or creation
    const schemaToUse = initialData?._id
      ? ProductUpdateSchema
      : ProductCreationSchema;

    try {
      const validatedData = schemaToUse.parse(dataToValidate);
      await onSubmit(validatedData as Partial<IProductData>); // Pass validated (and transformed) data
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof ProductFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            // Map Zod paths to form field names if they differ (e.g. price is string in form, number in schema)
            const fieldName = err.path[0] as keyof ProductFormData;
            errors[fieldName] = err.message;
          }
        });
        setFieldErrors(errors);
        console.error("Client-side validation errors:", errors);
      } else {
        // This will be handled by the parent component displaying formError
        console.error("Product form submission error:", error);
      }
    }
  };

  // Basic inline styles - should be moved to a CSS solution
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };
  const errorStyle: React.CSSProperties = {
    color: "red",
    fontSize: "0.9em",
    marginBottom: "10px",
  };
  const imageInputContainer: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    marginBottom: "5px",
  };
  const imageInput: React.CSSProperties = {
    flexGrow: 1,
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    marginRight: "5px",
  };
  const imageButton: React.CSSProperties = {
    padding: "8px",
    cursor: "pointer",
    backgroundColor: "#eee",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "20px",
        border: "1px solid #eee",
        borderRadius: "8px",
      }}
    >
      {formError && (
        <p style={errorStyle}>
          <strong>Form Error:</strong> {formError}
        </p>
      )}

      <div>
        <label htmlFor="name" style={labelStyle}>
          Product Name:
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        {fieldErrors.name && <p style={errorStyle}>{fieldErrors.name}</p>}
      </div>

      {initialData?._id &&
        formData.slug && ( // Display slug only for existing products and if it exists
          <div>
            <label htmlFor="slug" style={labelStyle}>
              Slug (URL Friendly):
            </label>
            <input
              type="text"
              name="slug"
              id="slug"
              value={formData.slug}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g., my-awesome-product (leave empty to auto-generate on name change during update)"
            />
            {fieldErrors.slug && <p style={errorStyle}>{fieldErrors.slug}</p>}
          </div>
        )}

      <div>
        <label htmlFor="description" style={labelStyle}>
          Description:
        </label>
        <textarea
          name="description"
          id="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={5}
          style={inputStyle}
        />
        {fieldErrors.description && (
          <p style={errorStyle}>{fieldErrors.description}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="price" style={labelStyle}>
            Price (e.g., 12.50):
          </label>
          <input
            type="number"
            name="price"
            id="price"
            value={formData.price}
            onChange={handleChange}
            required
            step="0.01"
            min="0.01"
            style={inputStyle}
          />
          {fieldErrors.price && <p style={errorStyle}>{fieldErrors.price}</p>}
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="stockQuantity" style={labelStyle}>
            Stock Quantity:
          </label>
          <input
            type="number"
            name="stockQuantity"
            id="stockQuantity"
            value={formData.stockQuantity}
            onChange={handleChange}
            required
            step="1"
            min="0"
            style={inputStyle}
          />
          {fieldErrors.stockQuantity && (
            <p style={errorStyle}>{fieldErrors.stockQuantity}</p>
          )}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Image URLs:</label>
        {formData.images.map((imgUrl, index) => (
          <div key={index} style={imageInputContainer}>
            <input
              type="url"
              value={imgUrl}
              onChange={(e) => handleImageChange(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              required={
                index === 0 &&
                formData.images.length === 1 &&
                imgUrl.trim() === ""
              } // First image required if only one field and it's empty
              style={imageInput}
            />
            {formData.images.length > 1 && (
              <button
                type="button"
                onClick={() => removeImageField(index)}
                style={{ ...imageButton, backgroundColor: "#ffdddd" }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addImageField}
          style={{
            ...imageButton,
            marginTop: "5px",
            backgroundColor: "#ddffdd",
          }}
        >
          Add Another Image URL
        </button>
        {fieldErrors.images && <p style={errorStyle}>{fieldErrors.images}</p>}
      </div>

      <div style={{ marginTop: "15px" }}>
        <label htmlFor="scentProfile" style={labelStyle}>
          Scent Profile (comma-separated):
        </label>
        <input
          type="text"
          name="scentProfile"
          id="scentProfile"
          value={formData.scentProfile}
          onChange={handleChange}
          style={inputStyle}
          placeholder="e.g., Lavender, Herbal, Floral"
        />
        {fieldErrors.scentProfile && (
          <p style={errorStyle}>{fieldErrors.scentProfile}</p>
        )}
      </div>
      <div>
        <label htmlFor="benefits" style={labelStyle}>
          Benefits (comma-separated):
        </label>
        <input
          type="text"
          name="benefits"
          id="benefits"
          value={formData.benefits}
          onChange={handleChange}
          style={inputStyle}
          placeholder="e.g., Stress Relief, Promotes Sleep"
        />
        {fieldErrors.benefits && (
          <p style={errorStyle}>{fieldErrors.benefits}</p>
        )}
      </div>
      <div>
        <label htmlFor="usageInstructions" style={labelStyle}>
          Usage Instructions:
        </label>
        <textarea
          name="usageInstructions"
          id="usageInstructions"
          value={formData.usageInstructions}
          onChange={handleChange}
          rows={3}
          style={inputStyle}
        />
        {fieldErrors.usageInstructions && (
          <p style={errorStyle}>{fieldErrors.usageInstructions}</p>
        )}
      </div>
      <div>
        <label htmlFor="ingredients" style={labelStyle}>
          Ingredients (comma-separated):
        </label>
        <input
          type="text"
          name="ingredients"
          id="ingredients"
          value={formData.ingredients}
          onChange={handleChange}
          style={inputStyle}
          placeholder="e.g., Lavandula Oil, Carrier Oil"
        />
        {fieldErrors.ingredients && (
          <p style={errorStyle}>{fieldErrors.ingredients}</p>
        )}
      </div>

      <div style={{ marginTop: "15px", display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          name="isActive"
          id="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          style={{ marginRight: "10px", transform: "scale(1.2)" }}
        />
        <label htmlFor="isActive" style={{ ...labelStyle, marginBottom: "0" }}>
          Product is Active
        </label>
        {fieldErrors.isActive && (
          <p style={errorStyle}>{fieldErrors.isActive}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          marginTop: "20px",
        }}
      >
        {isSubmitting ? "Submitting..." : submitButtonText}
      </button>
    </form>
  );
};

export default ProductForm;
