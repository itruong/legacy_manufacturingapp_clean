from django.contrib import admin
#from django.contrib.admin import AdminSite
from .models import *

# Register your models here.

#admin.site.register(Board)
'''
class MyAdminSite(AdminSite):
    site_header = 'Manufacturing Administration'
'''
#admin_site = MyAdminSite(name='myadmin')

admin.site.site_header = "Manufacturing Engineering"
admin.site.site_title = "Manufacturing"
