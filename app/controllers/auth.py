from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from app.models.user import User
from app import db, limiter
import random

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute", error_message="عدد محاولات تسجيل الدخول تجاوز الحد المسموح به. يرجى المحاولة بعد دقيقة.")
def login():
    if current_user.is_authenticated:
        return redirect(url_for('document.index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = bool(request.form.get('remember'))
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            if not user.is_active:
                flash('هذا الحساب معطل. يرجى التواصل مع المشرف.', 'error')
                return redirect(url_for('auth.login'))
                
            login_user(user, remember=remember)
            user.update_last_login()
            
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('document.index')
            return redirect(next_page)
            
        flash('اسم المستخدم أو كلمة المرور غير صحيحة', 'error')
    
    return render_template('auth/login.html')

@bp.route('/register', methods=['GET', 'POST'])
@limiter.limit("3 per hour")
def register():
    if current_user.is_authenticated:
        return redirect(url_for('document.index'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        full_name = request.form.get('full_name')
        
        error = None
        
        if not username:
            error = 'اسم المستخدم مطلوب'
        elif not password:
            error = 'كلمة المرور مطلوبة'
        elif User.query.filter_by(username=username).first():
            error = 'اسم المستخدم مستخدم بالفعل'
        elif email and User.query.filter_by(email=email).first():
            error = 'البريد الإلكتروني مستخدم بالفعل'
            
        if error is None:
            user = User(
                username=username,
                password=password,
                email=email,
                full_name=full_name
            )
            db.session.add(user)
            db.session.commit()
            
            flash('تم إنشاء الحساب بنجاح', 'success')
            return redirect(url_for('auth.login'))
            
        flash(error, 'error')
    
    return render_template('auth/register.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('تم تسجيل الخروج بنجاح', 'success')
    return redirect(url_for('auth.login'))

@bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        email = request.form.get('email')
        full_name = request.form.get('full_name')
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        
        error = None
        
        if email and email != current_user.email:
            if User.query.filter_by(email=email).first():
                error = 'البريد الإلكتروني مستخدم بالفعل'
            else:
                current_user.email = email
                
        if full_name:
            current_user.full_name = full_name
            
        if current_password and new_password:
            if not current_user.check_password(current_password):
                error = 'كلمة المرور الحالية غير صحيحة'
            else:
                current_user.set_password(new_password)
                
        if error is None:
            db.session.commit()
            flash('تم تحديث الملف الشخصي بنجاح', 'success')
        else:
            flash(error, 'error')
            
    return render_template('auth/profile.html')

@bp.route('/manage-users')
@login_required
def manage_users():
    if not current_user.is_admin:
        flash('غير مصرح لك بالوصول إلى صفحة إدارة المستخدمين', 'error')
        return redirect(url_for('document.index'))
    
    users = User.query.all()
    return render_template('auth/manage_users.html', users=users)

@bp.route('/admin/add-user', methods=['GET', 'POST'])
@login_required
def add_user():
    if not current_user.is_admin:
        flash('غير مصرح لك بإضافة مستخدمين جدد', 'error')
        return redirect(url_for('document.index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        full_name = request.form.get('full_name')
        role = request.form.get('role')
        
        error = None
        
        if not username:
            error = 'اسم المستخدم مطلوب'
        elif not password:
            error = 'كلمة المرور مطلوبة'
        elif User.query.filter_by(username=username).first():
            error = 'اسم المستخدم مستخدم بالفعل'
        elif email and User.query.filter_by(email=email).first():
            error = 'البريد الإلكتروني مستخدم بالفعل'
            
        if error is None:
            user = User(
                username=username,
                password=password,
                email=email,
                full_name=full_name,
                role=role
            )
            db.session.add(user)
            db.session.commit()
            
            flash('تم إضافة المستخدم بنجاح', 'success')
            return redirect(url_for('auth.manage_users'))
            
        flash(error, 'error')
    
    return render_template('auth/add_user.html')

@bp.route('/admin/update-role/<int:user_id>', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def update_role(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'غير مصرح لك بهذه العملية'}), 403
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'error': 'لا يمكنك تغيير دورك الخاص'}), 400
    
    new_role = request.form.get('role')
    if new_role not in ['user', 'admin', 'archive_officer', 'documentation', 'offload']:
        return jsonify({'error': 'دور غير صالح'}), 400
        
    user.role = new_role
    db.session.commit()
    
    flash('تم تغيير دور المستخدم بنجاح', 'success')
    return redirect(url_for('auth.manage_users'))

@bp.route('/admin/toggle-status/<int:user_id>', methods=['POST'])
@login_required
def toggle_status(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'error': 'Cannot deactivate your own account'}), 400

@bp.route('/documentation-users')
@login_required
def get_documentation_users():
    """Get list of all documentation users for permissions management."""
    if not current_user.is_admin:
        return jsonify([]), 403
        
    users = User.query.filter_by(role='documentation').all()
    user_list = [{
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name
    } for user in users]
    
    return jsonify(user_list)
        
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'success': True})

@bp.route('/admin/reset-password/<int:user_id>', methods=['POST'])
@login_required
@limiter.limit("3 per hour")
def reset_password(user_id):
    if not current_user.is_admin:
        flash('غير مصرح لك بإعادة تعيين كلمة المرور', 'error')
        return redirect(url_for('document.index'))
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('لا يمكنك إعادة تعيين كلمة المرور لحسابك الخاص', 'error')
        return redirect(url_for('auth.manage_users'))
    
    # Generate a random password
    new_password = 'Archive@' + ''.join(str(random.randint(0, 9)) for _ in range(4))
    user.set_password(new_password)
    db.session.commit()
    
    flash(f'تم إعادة تعيين كلمة المرور للمستخدم. كلمة المرور الجديدة هي: {new_password}', 'success')
    return redirect(url_for('auth.manage_users'))

@bp.route('/admin/delete/<int:user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    if not current_user.is_admin:
        flash('غير مصرح لك بحذف المستخدمين', 'error')
        return redirect(url_for('document.index'))
    
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        flash('لا يمكنك حذف حسابك الخاص', 'error')
        return redirect(url_for('auth.manage_users'))
        
    db.session.delete(user)
    db.session.commit()
    flash('تم حذف المستخدم بنجاح', 'success')
    return redirect(url_for('auth.manage_users'))