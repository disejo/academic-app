'use-client';
export function LoadingSpinner(){
    return(
        <div className="p-4 rounded-lg shadow-md w-full h-[400px] flex justify-center items-center">
        <div className="flex justify-center items-center py-12">
           <span className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></span>
        </div>
      </div>
    );
}