#!/bin/bash

# سكريبت لتحديث جميع صفحات النظام لتطبيق الألوان الجديدة

echo "🎨 بدء تحديث الألوان في جميع صفحات النظام..."

# قائمة الصفحات التي تحتاج تحديث
files=(
    "upload.html"
    "search.html"
    "scanner.html"
    "profile.html"
    "admin-management.html"
    "file-management-dashboard.html"
    "movement-reports.html"
    "file-tracking.html"
    "system-analytics.html"
    "role-manager.html"
    "create-admin.html"
)

# مسار مجلد الصفحات
public_dir="d:/Archive 2.1/public"

for file in "${files[@]}"; do
    file_path="$public_dir/$file"
    
    if [ -f "$file_path" ]; then
        echo "📄 معالجة الملف: $file"
        
        # إضافة رابط ملف CSS الجديد إذا لم يكن موجوداً
        if ! grep -q "assets/css/style.css" "$file_path"; then
            echo "  ➕ إضافة رابط ملف CSS الجديد"
            # البحث عن سطر Google Fonts وإضافة ملف CSS بعده
            sed -i '/Google Fonts/a\    <!-- تطبيق الألوان الجديدة -->\n    <link rel="stylesheet" href="assets/css/style.css">' "$file_path"
        fi
        
        # إزالة تعريفات الألوان القديمة من :root
        echo "  🗑️ إزالة الألوان القديمة"
        sed -i '/--primary: #667eea;/d' "$file_path"
        sed -i '/--primary-dark: #5a67d8;/d' "$file_path"
        sed -i '/--secondary: #f093fb;/d' "$file_path"
        sed -i '/--accent: #4facfe;/d' "$file_path"
        
        # تحديث الخلفيات المتدرجة القديمة
        echo "  🌈 تحديث الخلفيات المتدرجة"
        sed -i 's/#667eea/var(--primary)/g' "$file_path"
        sed -i 's/#764ba2/var(--ocean-deep)/g' "$file_path"
        sed -i 's/#f093fb/var(--secondary)/g' "$file_path"
        sed -i 's/#4facfe/var(--accent)/g' "$file_path"
        
        echo "  ✅ تم تحديث $file بنجاح"
    else
        echo "  ⚠️ الملف غير موجود: $file"
    fi
done

echo ""
echo "🎉 تم الانتهاء من تحديث جميع الصفحات!"
echo "📋 الملفات المحدثة:"
printf '   - %s\n' "${files[@]}"
echo ""
echo "💡 ملاحظة: تأكد من مراجعة الصفحات للتأكد من التطبيق الصحيح للألوان الجديدة"
