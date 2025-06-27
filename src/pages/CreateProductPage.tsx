
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ProducerSidebar from "@/components/ProducerSidebar";
import ProductForm from "@/components/products/ProductForm";

const CreateProductPage = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProducerSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-diypay-50 to-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Criar Novo Produto</h1>
            </div>
            
            <div className="container mx-auto px-4 py-8">
              <ProductForm mode="create" />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CreateProductPage;
