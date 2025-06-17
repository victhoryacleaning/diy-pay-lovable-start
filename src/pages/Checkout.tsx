
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ProductInfo } from "@/components/checkout/ProductInfo";
import { LoadingSpinner } from "@/components/checkout/LoadingSpinner";
import { toast } from "@/hooks/use-toast";

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [donationAmount, setDonationAmount] = useState<string>("");

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Product slug is required');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('checkout_link_slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw new Error('Product not found');
      }

      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Produto não encontrado",
        description: "O produto que você está tentando acessar não foi encontrado ou não está ativo.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Aplicar cor de fundo personalizada se definida
  const backgroundStyle = product.checkout_background_color 
    ? { backgroundColor: product.checkout_background_color }
    : {};

  return (
    <div className="min-h-screen py-8" style={backgroundStyle}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Imagem personalizada do checkout */}
        {product.checkout_image_url && (
          <div className="mb-8 text-center">
            <img 
              src={product.checkout_image_url} 
              alt={product.name}
              className="max-w-full h-auto mx-auto rounded-lg shadow-md max-h-64 object-cover"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Product Info Sidebar - só exibe se show_order_summary for true */}
          {product.show_order_summary && (
            <div className="lg:col-span-1">
              <ProductInfo 
                product={product} 
                donationAmount={donationAmount}
              />
            </div>
          )}

          {/* Checkout Form - ajustar grid dependendo do show_order_summary */}
          <div className={product.show_order_summary ? "lg:col-span-2" : "lg:col-span-3"}>
            <CheckoutForm 
              product={product}
              onDonationAmountChange={setDonationAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
