import BasicInfoOptionalSection from './item-form-sections/BasicInfoOptionalSection';
import BasicInfoRequiredSection from './item-form-sections/BasicInfoRequiredSection';
import FormHeaderSection from './item-form-sections/FormHeaderSection';
import PackageConversionSection from './item-form-sections/PackageConversionSection';
import PricingSection from './item-form-sections/PricingSection';
import SettingsSection from './item-form-sections/SettingsSection';

export const ItemFormSections = {
  Header: FormHeaderSection,
  BasicInfoRequired: BasicInfoRequiredSection,
  BasicInfoOptional: BasicInfoOptionalSection,
  Settings: SettingsSection,
  Pricing: PricingSection,
  PackageConversion: PackageConversionSection,
};
