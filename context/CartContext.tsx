import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { IProductData } from '@/types/productTypes'; // Assuming you have a plain type for Product data

// Define what a cart item will look like
export interface CartItem {
  product: IProductData; // Store the whole product object for easy display
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: IProductData, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number; // Total price in cents
  getTotalItems: () => number; // Total number of unique items or total quantity of all items
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on initial mount
  useEffect(() => {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        // TODO: Optionally re-validate product prices/availability against backend here
        // if prices can change or products can go out of stock while in cart.
        // For now, we trust the stored data.
        setCartItems(parsedCart);
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        localStorage.removeItem('shoppingCart'); // Clear corrupted cart
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0 || localStorage.getItem('shoppingCart')) { // Only save if cart has items or was previously saved (to clear it)
        localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const addToCart = useCallback((product: IProductData, quantity: number = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(item => item.product._id === product._id);
      if (existingItem) {
        // If item exists, update its quantity, ensuring it doesn't exceed stock
        const newQuantity = Math.min(existingItem.quantity + quantity, product.stockQuantity);
        return prevItems.map(item =>
          item.product._id === product._id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // If item doesn't exist, add it, ensuring quantity doesn't exceed stock
        const newQuantity = Math.min(quantity, product.stockQuantity);
        if (newQuantity > 0) {
            return [...prevItems, { product, quantity: newQuantity }];
        }
        return prevItems; // Don't add if stock is 0 or requested quantity is 0
      }
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems((prevItems) => prevItems.filter(item => item.product._id !== productId));
  }, []);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    setCartItems((prevItems) => {
      // Find the product to get its stock quantity for validation
      const itemToUpdate = prevItems.find(item => item.product._id === productId);
      if (!itemToUpdate) return prevItems;

      const validatedQuantity = Math.max(0, Math.min(quantity, itemToUpdate.product.stockQuantity));

      if (validatedQuantity === 0) {
        return prevItems.filter(item => item.product._id !== productId); // Remove if quantity is 0
      }
      return prevItems.map(item =>
        item.product._id === productId
          ? { ...item, quantity: validatedQuantity }
          : item
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('shoppingCart'); // Also clear from localStorage
  }, []);

  const getCartTotal = useCallback((): number => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0); // Price is in cents
  }, [cartItems]);

  const getTotalItems = useCallback((): number => {
    // This can be total unique products or total quantity of all products.
    // Let's do total quantity of all products:
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateItemQuantity, clearCart, getCartTotal, getTotalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};