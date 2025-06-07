
import Header from "@/components/Header";
import ProductList from "@/components/products/ProductList";

const ProductsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
      <Header isAuthenticated={true} userRole="producer" userName="Produtor" />
      
      <div className="container mx-auto px-4 py-8">
        <ProductList />
      </div>
    </div>
  );
};

export default ProductsPage;
