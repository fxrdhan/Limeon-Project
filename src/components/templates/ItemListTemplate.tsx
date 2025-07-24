import { ReactNode } from "react";
import { Card } from "@/components/card";
import PageTitle from "@/components/page-title";

interface ItemListTemplateProps {
  isLoading?: boolean;
  searchToolbar: ReactNode;
  dataTable: ReactNode;
  modal?: ReactNode;
}

export default function ItemListTemplate({
  isLoading = false,
  searchToolbar,
  dataTable,
  modal,
}: ItemListTemplateProps) {
  return (
    <>
      <Card
        className={
          isLoading
            ? "opacity-75 transition-opacity duration-300 flex-1 flex flex-col"
            : "flex-1 flex flex-col"
        }
      >
        <div className="mb-6">
          <PageTitle title="Daftar Item" />
        </div>
        
        {searchToolbar}
        
        {dataTable}
      </Card>
      
      {modal}
    </>
  );
}