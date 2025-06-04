
export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  );
};
