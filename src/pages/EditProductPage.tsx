
import { useParams } from 'react-router-dom';
import Header from "@/components/Header";
import ProductForm from "@/components/products/ProductForm";

const EditProductPage = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
      <Header isAuthenticated={true} userRole="producer" userName="Produtor" />
      
      <div className="container mx-auto px-4 py-8">
        <ProductForm productId={id} mode="edit" />
      </div>
    </div>
  );
};

export default EditProductPage;
