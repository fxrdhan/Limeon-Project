#!/bin/bash

# Naming Refactoring Helper Script
# This script helps automate the renaming of files and folders

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if git is clean
check_git_status() {
    if [[ -n $(git status -s) ]]; then
        print_warning "Git working directory is not clean!"
        print_warning "Please commit or stash your changes before running this script."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="./backups/refactor_${timestamp}"
    print_header "Creating Backup"
    mkdir -p "$backup_dir"
    cp -r src/features/item-management "$backup_dir/"
    print_success "Backup created at: $backup_dir"
}

# Phase 1: Rename folder structure
phase1_rename_folders() {
    print_header "Phase 1: Rename Folders"
    
    # Rename main folder
    if [ -d "src/features/item-management" ]; then
        print_warning "Renaming item-management → items"
        git mv src/features/item-management src/features/items 2>/dev/null || mv src/features/item-management src/features/items
        print_success "Main folder renamed"
    fi
    
    # Flatten presentation folder
    if [ -d "src/features/items/presentation" ]; then
        print_warning "Flattening presentation → components"
        mkdir -p src/features/items/components
        
        # Move all atoms, molecules, organisms, templates to components
        if [ -d "src/features/items/presentation/atoms" ]; then
            mv src/features/items/presentation/atoms/* src/features/items/components/ 2>/dev/null || true
        fi
        if [ -d "src/features/items/presentation/molecules" ]; then
            mv src/features/items/presentation/molecules/* src/features/items/components/ 2>/dev/null || true
        fi
        if [ -d "src/features/items/presentation/organisms" ]; then
            mv src/features/items/presentation/organisms/* src/features/items/components/ 2>/dev/null || true
        fi
        if [ -d "src/features/items/presentation/templates" ]; then
            mv src/features/items/presentation/templates/* src/features/items/components/ 2>/dev/null || true
        fi
        
        # Remove old presentation folder
        rm -rf src/features/items/presentation
        print_success "Presentation folder flattened"
    fi
    
    # Flatten application/hooks
    if [ -d "src/features/items/application/hooks" ]; then
        print_warning "Flattening application/hooks → hooks"
        mkdir -p src/features/items/hooks
        
        # Move all hooks to single hooks folder
        find src/features/items/application/hooks -name "*.ts" -type f -exec mv {} src/features/items/hooks/ \;
        
        # Remove old application folder
        rm -rf src/features/items/application
        print_success "Hooks folder flattened"
    fi
    
    # Rename domain to services
    if [ -d "src/features/items/domain" ]; then
        print_warning "Renaming domain → services"
        mv src/features/items/domain src/features/items/services
        print_success "Domain renamed to services"
    fi
    
    # Flatten shared folder
    if [ -d "src/features/items/shared" ]; then
        print_warning "Flattening shared folder"
        
        if [ -d "src/features/items/shared/contexts" ]; then
            mv src/features/items/shared/contexts src/features/items/contexts
        fi
        if [ -d "src/features/items/shared/types" ]; then
            mv src/features/items/shared/types src/features/items/types
        fi
        if [ -d "src/features/items/shared/utils" ]; then
            mv src/features/items/shared/utils src/features/items/utils
        fi
        
        rm -rf src/features/items/shared
        print_success "Shared folder flattened"
    fi
    
    print_success "Phase 1 complete!"
}

# Phase 2: Rename files
phase2_rename_files() {
    print_header "Phase 2: Rename Files"
    
    cd src/features/items || exit
    
    # Rename component files
    print_warning "Renaming component files..."
    
    # ItemManagementModal.tsx → Modal.tsx
    find . -name "ItemManagementModal.tsx" -exec bash -c 'mv "$0" "${0/ItemManagementModal/Modal}"' {} \;
    find . -name "ItemModalTemplate.tsx" -exec bash -c 'mv "$0" "${0/ItemModalTemplate/ModalTemplate}"' {} \;
    find . -name "ItemFormSections.tsx" -exec bash -c 'mv "$0" "${0/ItemFormSections/FormSections}"' {} \;
    find . -name "EntityManagementModal.tsx" -exec bash -c 'mv "$0" "${0/EntityManagementModal/EntityModal}"' {} \;
    
    # Rename hook files
    print_warning "Renaming hook files..."
    
    find . -name "useAddItemPageHandlers.ts" -exec bash -c 'mv "$0" "${0/useAddItemPageHandlers/useItem}"' {} \;
    find . -name "useItemFormValidation.ts" -exec bash -c 'mv "$0" "${0/useItemFormValidation/useValidation}"' {} \;
    find . -name "useGenericEntityManagement.ts" -exec bash -c 'mv "$0" "${0/useGenericEntityManagement/useEntityManager}"' {} \;
    find . -name "useItemModalOrchestrator.ts" -exec bash -c 'mv "$0" "${0/useItemModalOrchestrator/useModalState}"' {} \;
    
    cd ../../..
    
    print_success "Phase 2 complete!"
}

# Phase 3: Update imports
phase3_update_imports() {
    print_header "Phase 3: Update Imports"
    
    print_warning "This phase requires manual work or IDE refactoring"
    print_warning "Please use VS Code's 'Find and Replace in Files' (Ctrl+Shift+H)"
    print_warning ""
    print_warning "Suggested replacements:"
    echo "  1. item-management → items"
    echo "  2. ItemManagementModal → Modal"
    echo "  3. useAddItemPageHandlers → useItem"
    echo "  4. ItemManagementProvider → ItemProvider"
    echo "  5. presentation/templates/item/ → components/"
    echo "  6. application/hooks/form/ → hooks/"
    echo ""
    read -p "Press Enter when you've updated imports manually..."
}

# Phase 4: Type check
phase4_type_check() {
    print_header "Phase 4: Type Check"
    
    print_warning "Running TypeScript compiler..."
    if npm run type-check 2>&1 | tee /tmp/typecheck.log; then
        print_success "No TypeScript errors!"
    else
        print_error "TypeScript errors found. Please check /tmp/typecheck.log"
        print_warning "Fix the errors and run: npm run type-check"
    fi
}

# Phase 5: Test
phase5_test() {
    print_header "Phase 5: Run Tests"
    
    print_warning "Running tests..."
    if npm run test; then
        print_success "All tests passed!"
    else
        print_error "Some tests failed. Please fix them."
    fi
}

# Main menu
show_menu() {
    echo ""
    print_header "Naming Refactoring Tool"
    echo "Choose an option:"
    echo "  1. Run all phases (recommended)"
    echo "  2. Phase 1: Rename folders"
    echo "  3. Phase 2: Rename files"
    echo "  4. Phase 3: Update imports (manual)"
    echo "  5. Phase 4: Type check"
    echo "  6. Phase 5: Run tests"
    echo "  7. Create backup only"
    echo "  0. Exit"
    echo ""
    read -p "Enter choice: " choice
}

# Execute choice
execute_choice() {
    case $choice in
        1)
            check_git_status
            create_backup
            phase1_rename_folders
            phase2_rename_files
            phase3_update_imports
            phase4_type_check
            phase5_test
            ;;
        2)
            check_git_status
            create_backup
            phase1_rename_folders
            ;;
        3)
            check_git_status
            create_backup
            phase2_rename_files
            ;;
        4)
            phase3_update_imports
            ;;
        5)
            phase4_type_check
            ;;
        6)
            phase5_test
            ;;
        7)
            create_backup
            ;;
        0)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# Main loop
while true; do
    show_menu
    execute_choice
    echo ""
    read -p "Press Enter to continue..."
done
