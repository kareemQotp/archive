#!/bin/bash

# نسخ احتياطية وإدارة الإصدارات لنظام الأرشيف
# Version Management and Deployment Script for Archive System

set -e

# ألوان للعرض
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# متغيرات المشروع
PROJECT_NAME="archive-system"
BACKUP_DIR="backups"
CURRENT_DATE=$(date +"%Y%m%d_%H%M%S")

# دوال مساعدة
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# فحص المتطلبات
check_requirements() {
    print_info "فحص المتطلبات..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git غير مثبت"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js غير مثبت"
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI غير مثبت"
        print_info "قم بتثبيته باستخدام: npm install -g firebase-tools"
        exit 1
    fi
    
    print_success "جميع المتطلبات متوفرة"
}

# إنشاء نسخة احتياطية
create_backup() {
    print_info "إنشاء نسخة احتياطية..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    # نسخ احتياطية من الملفات المهمة
    tar -czf "$BACKUP_DIR/backup_${CURRENT_DATE}.tar.gz" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='functions/node_modules' \
        --exclude='functions/lib' \
        --exclude='.firebase' \
        --exclude='backups' \
        .
    
    print_success "تم إنشاء النسخة الاحتياطية: $BACKUP_DIR/backup_${CURRENT_DATE}.tar.gz"
}

# فحص حالة Git
check_git_status() {
    print_info "فحص حالة Git..."
    
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "يوجد تغييرات غير محفوظة"
        git status --short
        
        read -p "هل تريد حفظ التغييرات؟ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "أدخل رسالة الـ commit: " commit_message
            git add .
            git commit -m "$commit_message"
            print_success "تم حفظ التغييرات"
        else
            print_warning "لم يتم حفظ التغييرات"
        fi
    else
        print_success "جميع التغييرات محفوظة"
    fi
}

# إنشاء إصدار جديد
create_release() {
    print_info "إنشاء إصدار جديد..."
    
    # الحصول على آخر tag
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    print_info "آخر إصدار: $LAST_TAG"
    
    # اقتراح إصدار جديد
    if [[ $LAST_TAG =~ v([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
        MAJOR=${BASH_REMATCH[1]}
        MINOR=${BASH_REMATCH[2]}
        PATCH=${BASH_REMATCH[3]}
        
        SUGGESTED_PATCH="v$MAJOR.$MINOR.$((PATCH + 1))"
        SUGGESTED_MINOR="v$MAJOR.$((MINOR + 1)).0"
        SUGGESTED_MAJOR="v$((MAJOR + 1)).0.0"
    else
        SUGGESTED_PATCH="v1.0.0"
        SUGGESTED_MINOR="v1.0.0"
        SUGGESTED_MAJOR="v1.0.0"
    fi
    
    echo "اختر نوع الإصدار:"
    echo "1) Patch ($SUGGESTED_PATCH) - إصلاحات bugs"
    echo "2) Minor ($SUGGESTED_MINOR) - ميزات جديدة"
    echo "3) Major ($SUGGESTED_MAJOR) - تغييرات جذرية"
    echo "4) مخصص"
    
    read -p "اختر (1-4): " choice
    
    case $choice in
        1)
            NEW_TAG=$SUGGESTED_PATCH
            ;;
        2)
            NEW_TAG=$SUGGESTED_MINOR
            ;;
        3)
            NEW_TAG=$SUGGESTED_MAJOR
            ;;
        4)
            read -p "أدخل رقم الإصدار (مثال: v1.2.3): " NEW_TAG
            ;;
        *)
            print_error "اختيار غير صحيح"
            exit 1
            ;;
    esac
    
    read -p "أدخل وصف الإصدار: " release_message
    
    # إنشاء الـ tag
    git tag -a "$NEW_TAG" -m "$release_message"
    print_success "تم إنشاء الإصدار: $NEW_TAG"
}

# بناء المشروع
build_project() {
    print_info "بناء المشروع..."
    
    # بناء Cloud Functions
    if [ -d "functions" ]; then
        print_info "بناء Cloud Functions..."
        cd functions
        npm install
        npm run build
        cd ..
        print_success "تم بناء Cloud Functions"
    fi
    
    print_success "تم بناء المشروع بنجاح"
}

# اختبار المشروع
test_project() {
    print_info "اختبار المشروع..."
    
    # اختبار Firebase Functions
    if [ -d "functions" ]; then
        cd functions
        if npm run test 2>/dev/null; then
            print_success "اختبارات Functions نجحت"
        else
            print_warning "لا توجد اختبارات Functions أو فشلت"
        fi
        cd ..
    fi
    
    # فحص ملفات Firebase
    if [ -f "firebase.json" ]; then
        print_success "ملف firebase.json موجود"
    else
        print_error "ملف firebase.json غير موجود"
        exit 1
    fi
    
    if [ -f "firestore.rules" ]; then
        print_success "ملف firestore.rules موجود"
    else
        print_warning "ملف firestore.rules غير موجود"
    fi
    
    print_success "اكتملت الاختبارات"
}

# النشر على Firebase
deploy_firebase() {
    local environment=$1
    print_info "النشر على Firebase - البيئة: $environment"
    
    case $environment in
        "dev"|"development")
            firebase use development 2>/dev/null || print_warning "مشروع development غير موجود"
            ;;
        "prod"|"production")
            firebase use production 2>/dev/null || firebase use default
            ;;
        *)
            firebase use default
            ;;
    esac
    
    # نشر انتقائي
    echo "اختر ما تريد نشره:"
    echo "1) الكل (hosting + functions + firestore)"
    echo "2) الواجهة فقط (hosting)"
    echo "3) الوظائف فقط (functions)"
    echo "4) قوانين قاعدة البيانات فقط (firestore:rules)"
    
    read -p "اختر (1-4): " deploy_choice
    
    case $deploy_choice in
        1)
            firebase deploy
            ;;
        2)
            firebase deploy --only hosting
            ;;
        3)
            firebase deploy --only functions
            ;;
        4)
            firebase deploy --only firestore:rules
            ;;
        *)
            print_error "اختيار غير صحيح"
            exit 1
            ;;
    esac
    
    print_success "تم النشر بنجاح"
}

# رفع على GitHub
push_to_github() {
    print_info "رفع على GitHub..."
    
    # رفع الكود
    git push origin $(git branch --show-current)
    
    # رفع الـ tags
    git push origin --tags
    
    print_success "تم الرفع على GitHub"
}

# قائمة التنظيف
cleanup() {
    print_info "تنظيف الملفات المؤقتة..."
    
    # حذف ملفات البناء المؤقتة
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    # تنظيف cache
    if [ -d "functions/node_modules" ]; then
        cd functions
        npm prune
        cd ..
    fi
    
    print_success "تم التنظيف"
}

# عرض الإحصائيات
show_stats() {
    print_info "إحصائيات المشروع:"
    
    echo "📊 إحصائيات Git:"
    echo "   - عدد الـ commits: $(git rev-list --count HEAD)"
    echo "   - آخر commit: $(git log -1 --format="%h - %s (%cr)")"
    echo "   - الفرع الحالي: $(git branch --show-current)"
    
    if [ -d "public" ]; then
        echo "📁 ملفات المشروع:"
        echo "   - ملفات HTML: $(find public -name "*.html" | wc -l)"
        echo "   - ملفات JS: $(find public/assets/js -name "*.js" 2>/dev/null | wc -l || echo 0)"
    fi
    
    if [ -d "functions" ]; then
        echo "⚡ Cloud Functions:"
        echo "   - ملفات TypeScript: $(find functions/src -name "*.ts" 2>/dev/null | wc -l || echo 0)"
    fi
}

# القائمة الرئيسية
main_menu() {
    echo "🚀 مدير إصدارات نظام الأرشيف"
    echo "=================================="
    echo "1) فحص المتطلبات"
    echo "2) إنشاء نسخة احتياطية"
    echo "3) فحص حالة Git"
    echo "4) إنشاء إصدار جديد"
    echo "5) بناء المشروع"
    echo "6) اختبار المشروع"
    echo "7) النشر على Firebase"
    echo "8) رفع على GitHub"
    echo "9) تنظيف الملفات"
    echo "10) عرض الإحصائيات"
    echo "11) عملية شاملة (الكل)"
    echo "0) خروج"
    
    read -p "اختر (0-11): " choice
    
    case $choice in
        1) check_requirements ;;
        2) create_backup ;;
        3) check_git_status ;;
        4) create_release ;;
        5) build_project ;;
        6) test_project ;;
        7) 
            read -p "أدخل البيئة (dev/prod): " env
            deploy_firebase $env
            ;;
        8) push_to_github ;;
        9) cleanup ;;
        10) show_stats ;;
        11) full_deployment ;;
        0) exit 0 ;;
        *) print_error "اختيار غير صحيح" ;;
    esac
}

# عملية نشر شاملة
full_deployment() {
    print_info "بدء العملية الشاملة..."
    
    check_requirements
    create_backup
    check_git_status
    build_project
    test_project
    
    read -p "هل تريد إنشاء إصدار جديد؟ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_release
    fi
    
    read -p "أدخل البيئة للنشر (dev/prod): " env
    deploy_firebase $env
    
    push_to_github
    cleanup
    
    print_success "اكتملت العملية الشاملة بنجاح! 🎉"
    show_stats
}

# تشغيل القائمة الرئيسية
if [ $# -eq 0 ]; then
    while true; do
        main_menu
        echo
        read -p "اضغط Enter للمتابعة..." 
        clear
    done
else
    # تشغيل الأمر المباشر
    case $1 in
        "check") check_requirements ;;
        "backup") create_backup ;;
        "status") check_git_status ;;
        "release") create_release ;;
        "build") build_project ;;
        "test") test_project ;;
        "deploy") deploy_firebase ${2:-prod} ;;
        "push") push_to_github ;;
        "cleanup") cleanup ;;
        "stats") show_stats ;;
        "full") full_deployment ;;
        *) 
            echo "الاستخدام: $0 [check|backup|status|release|build|test|deploy|push|cleanup|stats|full]"
            exit 1
            ;;
    esac
fi
