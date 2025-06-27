
import { useParams } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ProducerSidebar from "@/components/ProducerSidebar";
import ProductForm from "@/components/products/ProductForm";

const EditProductPage = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Editar Produto</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8">
              <ProductForm productId={id} mode="edit" />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default EditProductPage;
