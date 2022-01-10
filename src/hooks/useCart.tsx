import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productOnCart: Product[] = cart.filter(
        (product) => product.id === productId
      );
      const onStock: Stock = await api
        .get(`stock/${productId}`)
        .then((resp) => resp.data);
      const stockDebt = productOnCart[0]?.amount + 1 || 1;

      if (stockDebt > onStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productOnCart.length > 0) {
        cart.forEach((product) => {
          if (product.id === productId) {
            product.amount += 1;
          }
        });

        setCart([...cart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      } else {
        const product = await api
          .get(`products/${productId}`)
          .then((resp) => resp.data);

        const changedCart = [
          ...cart,
          {
            ...product,
            amount: 1,
          },
        ];

        setCart(changedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(changedCart));
      }

      toast.success("Produto incluído no carrinho");
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productOnCart = cart.filter((product) => product.id === productId);

      if (productOnCart.length < 1) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const cartChanged = cart.filter((product) => product.id !== productId);

      setCart([...cartChanged]);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartChanged));
    } catch (e) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productOnCart: Product[] = cart.filter(
        (product) => product.id === productId
      );

      if (amount < 1) return;

      const onStock: Stock = await api
        .get(`stock/${productId}`)
        .then((resp) => resp.data);

      if (amount > onStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart.forEach((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
      });

      setCart([...cart]);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    } catch (e) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
