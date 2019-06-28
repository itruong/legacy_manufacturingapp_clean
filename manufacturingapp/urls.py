"""DetectorEfficiency URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.contrib.auth import urls
#import django.contrib.auth.views as auth_views

from django.urls import path, re_path, include

from labortracker import views
#from accounts import views as accounts_views

urlpatterns = [
    
    re_path(r'^$', views.home, name='home'),
    #re_path(r'^signup/$', accounts_views.signup, name='signup'),
    re_path(r'^detector/tracker$', views.DetectorFormView.as_view(), name='detector_form'),
    re_path(r'^systems/tracker/$', views.SystemsFormView.as_view(), name='security_form'),
    re_path(r'^detector/tracker/view$', views.DetectorFormReadOnlyView.as_view(), name='detector_form_view'),
    re_path(r'^systems/tracker/view$', views.SystemsFormReadOnlyView.as_view(), name='security_form_view'),
    re_path(r'^systems/analyze/$', views.form_analyze, name='systems_analyze'),
    re_path(r'^detector/analyze/$', views.detector_analyze, name="detector_analyze"),
    re_path(r'^management/$', views.management, name="management"),
    re_path(r'^systems/submissions/$', views.SubmissionsView.as_view(datatable="Systems"), name="systems_submissions"),
    re_path(r'^detector/submissions/$', views.SubmissionsView.as_view(datatable="DAS/Detector"), name="detector_submissions"),
    re_path(r'^detector/settings/$', views.DetectorSettingsView.as_view(), name="detector_settings"),
    #re_path(r'^view_form/$', views.view_form),
    path('admin/', admin.site.urls,),
    
    path('accounts/', include('django.contrib.auth.urls')),
    path('accounts/profile/', views.profile, name='profile'),
    
]

'''
    path('login/', auth_views.LoginView.as_view(
        template_name='login.html',
    ),
    name='login',
    ),
'''