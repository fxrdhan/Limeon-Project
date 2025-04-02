import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { FormActions } from '../../components/ui/FormActions';
import { FormSection } from '../../components/ui/FormComponents';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';
import { useItemSelection } from '../../hooks/useItemSelection';
import PurchaseInformationForm from '../../components/purchases/PurchaseInfoForm';
import ItemSearchBar from '../../components/purchases/ItemSearchBar';
import PurchaseItemsTable from '../../components/purchases/PurchaseItemsTable';

const CreatePurchase: React.FC = () => {
    const navigate = useNavigate();
    const {
        formData,
        suppliers,
        purchaseItems,
        total,
        loading,
        handleChange,
        addItem,
        updateItem,
        handleUnitChange,
        updateItemVat,
        updateItemExpiry,
        updateItemBatchNo,
        removeItem,
        handleSubmit
    } = usePurchaseForm();

    const {
        searchItem,
        setSearchItem,
        showItemDropdown,
        setShowItemDropdown,
        selectedItem,
        setSelectedItem,
        filteredItems,
        getItemByID
    } = useItemSelection();

    const onHandleSubmit = (e: React.FormEvent) => {
        handleSubmit(e);
    };

    const onHandleUnitChange = (id: string, unitName: string) => {
        handleUnitChange(id, unitName, getItemByID);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tambah Pembelian Baru</CardTitle>
            </CardHeader>
            
            <form onSubmit={onHandleSubmit}>
                <CardContent className="space-y-6">
                    <PurchaseInformationForm 
                        formData={formData}
                        suppliers={suppliers}
                        handleChange={handleChange}
                    />
                    
                    <FormSection title="Daftar Item">
                        <ItemSearchBar 
                            searchItem={searchItem}
                            setSearchItem={setSearchItem}
                            showItemDropdown={showItemDropdown}
                            setShowItemDropdown={setShowItemDropdown}
                            filteredItems={filteredItems}
                            selectedItem={selectedItem}
                            setSelectedItem={setSelectedItem}
                            onAddItem={addItem}
                        />
                        
                        <PurchaseItemsTable 
                            purchaseItems={purchaseItems}
                            total={total}
                            onUpdateItem={updateItem}
                            onRemoveItem={removeItem}
                            onUpdateItemVat={updateItemVat}
                            onUpdateItemExpiry={updateItemExpiry}
                            onUpdateItemBatchNo={updateItemBatchNo}
                            onUnitChange={onHandleUnitChange}
                            getItemByID={getItemByID}
                        />
                    </FormSection>
                </CardContent>
                
                <CardFooter className="flex justify-between">
                    <FormActions
                        onCancel={() => navigate('/purchases')}
                        isSaving={loading}
                        isDisabled={purchaseItems.length === 0}
                    />
                </CardFooter>
            </form>
        </Card>
    );
};

export default CreatePurchase;