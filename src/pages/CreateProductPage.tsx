
import Header from "@/components/Header";
import ProductForm from "@/components/products/ProductForm";

const CreateProductPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
      <Header isAuthenticated={true} userRole="producer" userName="Produtor" />
      
      <div className="container mx-auto px-4 py-8">
        <ProductForm mode="create" />
      </div>
    </div>
  );
};

export default CreateProductPage;
