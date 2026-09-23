// Analytics Tracker: Google Analytics 4 (Measurement ID: G-G4GMVNMCZ7)

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export interface GA4Item {
  item_id: string | number;
  item_name: string;
  item_category?: string;
  price: number;
  quantity?: number;
  item_variant?: string;
}

export const analytics = {
  // 1. View Item List / Category
  viewItemList: (categoryName: string, items: GA4Item[]) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'view_item_list', {
        item_list_id: categoryName.toLowerCase().replace(/\s+/g, '_'),
        item_list_name: categoryName,
        items: items.slice(0, 20).map((item, idx) => ({
          ...item,
          index: idx + 1,
        })),
      });
    }
  },

  // 2. View Item (Product Detail Page)
  viewItem: (product: { id: number | string; name: string; category?: string; price: number; weight?: string; image?: string }) => {
    if (typeof window !== 'undefined') {
      // GA4 Event
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_item', {
          currency: 'USD',
          value: product.price,
          items: [
            {
              item_id: String(product.id),
              item_name: product.name,
              item_category: product.category,
              price: product.price,
              quantity: 1,
              item_variant: product.weight,
            },
          ],
        });
      }
    }
  },

  // 3. Add to Cart
  addToCart: (product: { id: number | string; name: string; category?: string; price: number }, quantity: number, weight?: string) => {
    if (typeof window !== 'undefined') {
      // GA4 Event
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'add_to_cart', {
          currency: 'USD',
          value: product.price * quantity,
          items: [
            {
              item_id: String(product.id),
              item_name: product.name,
              item_category: product.category,
              price: product.price,
              quantity,
              item_variant: weight,
            },
          ],
        });
      }
    }
  },

  // 4. Begin Checkout
  beginCheckout: (items: Array<{ product: { id: number | string; name: string; category?: string; price: number }; quantity: number }>, totalValue: number) => {
    if (typeof window !== 'undefined') {
      // GA4 Event
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'begin_checkout', {
          currency: 'USD',
          value: totalValue,
          items: items.map((item) => ({
            item_id: String(item.product.id),
            item_name: item.product.name,
            item_category: item.product.category,
            price: item.product.price,
            quantity: item.quantity,
          })),
        });
      }
    }
  },

  // 5. Purchase Complete
  purchase: (order: {
    orderId: string;
    value: number;
    items: Array<{ id: number | string; name: string; price: number; quantity: number; category?: string }>;
    shipping?: number;
    coupon?: string;
  }) => {
    if (typeof window !== 'undefined') {
      // GA4 Event
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', {
          transaction_id: order.orderId,
          value: order.value,
          currency: 'USD',
          shipping: order.shipping || 0,
          coupon: order.coupon || undefined,
          items: order.items.map((item) => ({
            item_id: String(item.id),
            item_name: item.name,
            item_category: item.category,
            price: item.price,
            quantity: item.quantity,
          })),
        });
      }
    }
  },

  // 6. Identify User (GA4 User Properties)
  identify: (user: { email?: string; firstName?: string; lastName?: string; phone?: string; userId?: string }) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      if (user.userId || user.email) {
        window.gtag('set', 'user_properties', {
          user_id: user.userId || user.email,
        });
      }
    }
  },
};

