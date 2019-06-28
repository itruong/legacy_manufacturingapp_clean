from django.db import models
from django.template.defaultfilters import slugify
from django.contrib.auth.models import User

# Create your models here.

class SystemLabor(models.Model):
    serial = models.CharField(max_length=10)#system number or other
    op = models.CharField(max_length=10)#operation number
    #assy = models.CharField(max_length=20)
    work_type = models.CharField(max_length=20)
    task_date = models.DateField()
    hrs = models.DecimalField(max_digits=3, decimal_places=1)
    #qty = models.IntegerField()
    created_on = models.DateTimeField()
    created_by = models.ForeignKey(User, null=True, related_name='SystemLabor', on_delete=models.CASCADE)
    system = models.CharField(max_length=16)#system name
    form_row = models.IntegerField()
    comments = models.CharField(max_length=200)

class DetectorLabor(models.Model):
    #board = models.ForeignKey(Board, related_name='posts', on_delete=models.CASCADE)
    task = models.CharField(max_length=255)
    labor_type = models.CharField(max_length=255)
    task_date = models.DateField()
    qty = models.IntegerField()
    hrs = models.DecimalField(max_digits=4, decimal_places=1)
    created_on = models.DateTimeField()
    created_by = models.ForeignKey(User, null=True, related_name='DetectorLabor', on_delete=models.CASCADE)
    form_row = models.IntegerField()
    comments = models.CharField(max_length=200)
    wrkOrd = models.IntegerField()

class DetectorTasks(models.Model):
    task = models.CharField(max_length=255)
    pn = models.CharField(max_length=255)
    descr = models.CharField(max_length=255)
    system = models.CharField(max_length=255)
    qty = models.IntegerField()
    min_SAP = models.IntegerField()
    created_on = models.DateTimeField()

    def __str__(self):
        return self.task

class PermissionsList(models.Model):
    class Meta:
        permissions = (
            ('manufacturing_systems_form', 'view Systems form'),
            ('manufacturing_subsystems_form', 'view Subsystems form'),
            ('manufacturing_*_form', 'view * form'),
        )