#django imports
from django import forms
from django.forms import formset_factory
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import *

#my imports
from .models import *
from .my_utilities import *

#python imports
from datetime import datetime, timedelta

def inList(tasks, adj_tasks=[]):
    def validator(value):
        value = str(value)
        if (value not in tasks) and (value not in adj_tasks):
            return False
        return True    
    return validator

def validate_inList(tasks, adj_tasks=[]): #can upgrade to use *args
    def validator(value):
        value = str(value)
        
        if (value.upper() not in tasks) and (value.upper() not in adj_tasks):
            raise ValidationError('Invalid value: %s' % value)
        elif (value in adj_tasks):
            return value
    
    return validator

def validate_dateRange(min, max):
    def validator(value):
        valStr = value.strftime("%Y-%m-%d")
        if datetime.strptime(valStr, "%Y-%m-%d") < datetime.strptime(min, "%Y-%m-%d"):
            raise ValidationError('Invalid Date; date too old: %s' % value.strftime("%Y-%m-%d"))
        elif datetime.strptime(valStr, "%Y-%m-%d") > datetime.strptime(max, "%Y-%m-%d"):
            raise ValidationError('Invalid Date; future date: %s' % value.strftime("%Y-%m-%d"))

    return validator

#need to optimize for any system form (include connect, RR, etc.)
def validate_alreadySubmit(user):# need a validation method for resubmit...
    def validator(value):
        sun_date = getDateSun(value).replace(tzinfo=None)
        entries = SystemLabor.objects.filter(created_by=user
            ).filter(task_date__gte=sun_date
            ).exclude(task_date__gte=sun_date+timedelta(days=7)
            )
        if entries and (datetime.today().replace(tzinfo=None) - sun_date).days >= 14:
            raise ValidationError('Submissions for the week of %s has ended.' % sun_date.strftime("%Y-%m-%d"))
    return validator

def validate_maxLength(maxVal):
    def validator(value):
        if len(value) > maxVal:
            raise ValidationError('Too many characters (Must be 200 characters or less)')
    return validator

#need to optimize dateForm for use with any date. right now, validation only allows for systemlabor
class dateForm(forms.Form):
    def __init__(self, *args, user, req, **kwargs):
        self.user = user
        self.req = req
        super(dateForm, self).__init__(*args, **kwargs)

        self.fields['date'] = forms.DateTimeField(widget=forms.DateInput(
            attrs={
                "type": "date",
                "oninput": "showDateLabels('taskTableDays[]', this.value);showCols('taskTableDays[]','Hrs');",
                "min": "2019-01-01",
                "max": datetime.now().strftime("%Y-%m-%d"),
                },
                ),
                initial = datetime.now().strftime("%Y-%m-%d"),
                validators=[validate_dateRange("2019-01-01", datetime.now().strftime("%Y-%m-%d")),
                    validate_alreadySubmit(self.user)],
            )   

class DetectorDivForm(forms.Form):    
    entries = SystemLabor.objects.all()
    
    def __init__(self, *args, req=False, user, **kwargs):
        self.user = user
        self.req = req
        super(DetectorDivForm, self).__init__(*args, **kwargs)

        for i in range(0, 7):
            if i % 7 == 0:
                self.fields['com_%s' % int(i/7)] = forms.CharField(widget=forms.Textarea(
                    attrs={
                        "class": "com",
                        "onfocusout": "this.innerHTML = this.value",
                    },
                    ),
                    required=False,
                    validators=[validate_maxLength(200)],
                )
            self.fields['tal_%s' % i] = forms.DecimalField(widget=forms.NumberInput(
                attrs={
                    "step":".1",
                    "oninput":"calcTotLab(this.id, 1, 'total'); calcDailyLab(this.id, 1, 'dailyTotal', ['divForm', 'nsForm', 'prodForm'])",
                    "onfocusout": "this.setAttribute('value', this.value);",
                },
                ),
                min_value = 0,
                decimal_places = 1,
                label='',
                required=False,
            )

class DetectorProdForm(forms.Form):
    tasks = DetectorTasks.objects.all().order_by('id')
    tarr = list(map(lambda x: (x.task, x.task), tasks))
    parr = sorted(list(set(map(lambda x: (x.pn, x.pn), tasks))))
    additional = ['OTHER']
    additional_arr = [(item, item) for item in additional]
    tarr = additional_arr + tarr
    parr = additional_arr + parr
    
    def __init__(self, *args, req=False, user, **kwargs):
        self.user = user
        self.req = req
        super(DetectorProdForm, self).__init__(*args, **kwargs)
        
        for i in range(0, 7):
            if i % 7 == 0:
                self.fields['tas_%s' % int(i/7)] = forms.ChoiceField(widget=forms.TextInput(
                    attrs={
                        "list": "tasklist",
                        "class":"tas_sel[]",
                        "oninput": "this.setAttribute('value', this.value); showTasks(this);",
                    },
                    ),
                    required=False,
                    choices=self.tarr,
                )
                self.fields['par_%s' % int(i/7)] = forms.ChoiceField(widget=forms.TextInput(
                    attrs={
                        "list": "partlist",
                        "class":"par_sel[]",
                        "oninput": "this.setAttribute('value', this.value); showParts(this);",
                    },
                    ),
                    required=False,
                    choices=self.parr,
                )
                self.fields['wrk_%s' % int(i/7)] = forms.IntegerField(widget=forms.TextInput(
                    attrs={
                        "class": "wrk",
                        "onfocusout": "this.setAttribute('value',this.value);",
                    },
                    ),
                    required=False,
                    validators=[MinValueValidator(0)],
                )
                self.fields['com_%s' % int(i/7)] = forms.CharField(widget=forms.Textarea(
                    attrs={
                        "class": "com",
                        "onfocusout": "this.innerHTML = this.value",
                    },
                    ),
                    required=False,
                    validators=[validate_maxLength(200)],
                )
            self.fields['taq_%s' % i] = forms.DecimalField(widget=forms.NumberInput(
                attrs={
                    "step":"1",
                    "oninput":"calcTotLab(this.id, 0, 'totalq')",
                    "onfocusout": "this.setAttribute('value', this.value);",
                },
                ),
                min_value = 0,
                decimal_places = 0,
                label='',
                required=False,
            )
            self.fields['tal_%s' % i] = forms.DecimalField(widget=forms.NumberInput(
                attrs={

                    "step":".1",
                    "oninput":"if(this.value > 16) {this.value = 16}; calcTotLab(this.id, 1, 'totall'); calcDailyLab(this.id, 1, 'dailyTotal', ['divForm', 'nsForm', 'prodForm'])",
                    "onfocusout": "this.setAttribute('value', this.value);",
                },
                ),
                max_value = 16,
                min_value = 0,
                decimal_places = 1,
                label='',
                required=False,
            )

    @classmethod
    def refreshData(cls):
        cls.tasks = DetectorTasks.objects.all().order_by('id')
        cls.tarr = list(map(lambda x: (x.task, x.task), cls.tasks))
        cls.parr = sorted(list(set(map(lambda x: (x.pn, x.pn), cls.tasks))))
        cls.additional = ['OTHER']
        cls.additional_arr = [(item, item) for item in cls.additional]
        cls.tarr = cls.additional_arr + cls.tarr
        cls.parr = cls.additional_arr + cls.parr
    
    def clean(self):
        cleaned_data = super().clean()
        tas = cleaned_data.get('tas_0')
        com = cleaned_data.get('com_0')

        empty = True
        for v in cleaned_data.values():
            if v:
                empty = False
        if empty:
            return
        if not tas:
            self.add_error('tas_0', "This field is required.")
        else:
            for i in range(0, 7):
                if (cleaned_data.get('tal_%s' % i) == None or cleaned_data.get('tal_%s' % i) == 0) and (cleaned_data.get('taq_%s' % i) != None and cleaned_data.get('taq_%s' % i) != 0):
                    self.add_error('tal_%s' % i, "Please include Hrs when Qty is completed")
            
            if self.req and tas == "OTHER" and com == "":
                self.add_error('com_0', "This field is required when 'OTHER' is specified")

class FileUploadForm(forms.Form):
    file = forms.FileField()

class SecurityForm(forms.Form):
    opFields = [getOpFields(system) for system in getSystemFields()] #[[],getOpFields, getOpFields_ANRR00(), getOpFields_TITAN()]
    systemFields = getSystemFields()
    wtypeFields = getWTypeFields()
    
    def __init__(self, *args, req=False, user, **kwargs):
        self.user = user
        self.req = req
        entries = SystemLabor.objects.all()
        self.serialFields = [
            [],
            getSerialFields_ANCP00(entries.filter(system="*")), 
            getSerialFields_ANRR00(entries.filter(system="*")), 
            getSerialFields_HTBL28(entries.filter(system="*")),
            getSerialFields_TITAN(entries.filter(system="*"))
        ]
        

        super(SecurityForm, self).__init__(*args, **kwargs)

        for i in range(0, 7):
            if i % 7 == 0:
                
                self.fields['sys_%s' % int(i/7)] = forms.CharField(widget=forms.TextInput(
                    attrs={
                        "list": "systemlist",
                        "class": "sys_sel[]",
                        "oninput": "/*disable(this.id, systemList);*/ loadDatalist('oplist', opLists, systemList, this.id);",
                        "onfocusout": "this.setAttribute('value', this.value);",
                    },
                    ),
                    required=False,
                    validators=[validate_inList(self.systemFields,[])],
                )
                self.fields['sns_%s' % int(i/7)] = forms.CharField(widget=forms.TextInput(
                    attrs={
                        "class": "sns_sel[]",
                        "onfocusout": "this.setAttribute('value', this.value);",
                    },
                    ),
                    required=False,
                )
                self.fields['ops_%s' % int(i/7)] = forms.CharField(widget=forms.TextInput(
                    attrs={
                        "class": "ops_sel[]",
                        "onfocusout": "this.setAttribute('value', this.value);",
                    },
                    ),
                    required=False,
                )
                self.fields['wty_%s' % int(i/7)] = forms.CharField(widget=forms.TextInput(
                    attrs={
                        "list": "wtypelist",
                        "class": "wty_sel[]",
                        "onfocusout": "this.setAttribute('value', this.value);",
                    },
                    ),
                    required=False,
                    #initial="PROD",
                    validators=[validate_inList(self.wtypeFields, [])],
                )
                self.fields['com_%s' % int(i/7)] = forms.CharField(widget=forms.Textarea(
                    attrs={
                        "class": "com",
                        "onfocusout": "this.innerHTML = this.value",
                    },
                    ),
                    required=False,
                    validators=[validate_maxLength(200)],
                )
            self.fields['tal_%s' % i] = forms.DecimalField(widget=forms.NumberInput(
                attrs={
                    "step":".1",
                    "oninput":"if(this.value > 16) {this.value = 16}; calcTotLab(this.id, 1, 'total'); calcDailyLab(this.id, 1, 'dailyTotal', ['form'])",
                    "onfocusout": "this.setAttribute('value', this.value);",
                },
                ),
                max_value =16,
                min_value = 0,
                #initial = 0,
                decimal_places = 1,
                #label='hrs:',
                required=False,
            )

    def clean(self):
        cleaned_data = super().clean()
        sys = cleaned_data.get('sys_0')
        sns = cleaned_data.get('sns_0')
        ops = cleaned_data.get('ops_0')
        wty = cleaned_data.get('wty_0')
        com = cleaned_data.get('com_0')

        empty = True
        for v in cleaned_data.values():
            if v:
                empty = False
        if empty:
            return
        if not sys:
            self.add_error('sys_0', "This field is required.")
        else:
            for i in range(0, len(self.systemFields)):
                if sys == self.systemFields[i]:
                    if i == 0:
                        if self.req and com == "":
                            self.add_error('com_0', "This field is required when 'OTHER' is specified")
                    else:
                        if sns == "" and self.req:
                            self.add_error('sns_0', "This field is required. ")
                        elif sns != "" and not inList(self.serialFields[i])(sns):
                            self.add_error('sns_0', "Serial number '"+sns+"' is invalid for "+ sys)
                        if ops == "" and self.req:
                            self.add_error('ops_0', "This field is required. ")                    
                        elif ops != "" and not inList(self.opFields[i])(ops):
                            self.add_error('ops_0', "OP '"+ops+"' is invalid for "+ sys)
                        if wty == "" and self.req:
                            self.add_error('wty_0', "This field is required. ")

        if self.req and wty == "WAIT PARTS" and com == "":
            self.add_error('com_0', "Please include the short part number")
        

class ProfileForm(forms.Form):
          
    def __init__(self, *args, user, **kwargs):
        self.user = user
        super(ProfileForm, self).__init__(*args, **kwargs)

        if user.has_perm('labortracker.manufacturing_systems_form'):
            submits_sys = SystemLabor.objects.filter(created_by=user).order_by('-created_on')
        else:
            saves_sys = []
            submits_sys = []
        if user.has_perm('labortracker.manufacturing_*_form'):
            submits_det = DetectorLabor.objects.filter(created_by=user).order_by('-created_on')
        else:
            submits_det = []
        self.submits_sys_json = {}
        self.submits_det_json = {}
        self.submits_json = []

        for entry in submits_sys:
            if getDateSun(entry.task_date).strftime("%Y-%m-%d")+'systems' not in self.submits_sys_json:
                self.submits_sys_json[getDateSun(entry.task_date).strftime("%Y-%m-%d")+'systems'] = ['Systems', getDateSun(entry.task_date).strftime("%Y-%m-%d"), entry.created_on.strftime("%d %b, %Y %I:%M:%S %p")]
        for entry in submits_det:
            if getDateSun(entry.task_date).strftime("%Y-%m-%d")+'DAS/Detector' not in self.submits_det_json:
                self.submits_det_json[getDateSun(entry.task_date).strftime("%Y-%m-%d")+'*'] = ['*', getDateSun(entry.task_date).strftime("%Y-%m-%d"), entry.created_on.strftime("%d %b, %Y %I:%M:%S %p")]

        submits_dict = {**self.submits_sys_json, **self.submits_det_json}
        submits_keys = sorted(submits_dict.keys(), reverse=True)

        for key in submits_keys:
            self.submits_json.append(submits_dict[key])

        self.fields['date'] = forms.DateField()#need to validate against list depending on 'table'
        self.fields['type'] = forms.CharField(validators=[validate_inList(['SYSTEMS', 'DAS/DETECTOR'])])
        self.fields['table'] = forms.CharField(validators=[validate_inList(['SUBMIT'])])

    def clean(self):
        cleaned_data = super().clean()
        date = cleaned_data.get('date')
        typeField = cleaned_data.get('type')
        table = cleaned_data.get('table')

        if [typeField, date.strftime("%Y-%m-%d")] not in list(map(lambda x: [x[0], x[1]], self.submits_json)):
            raise forms.ValidationError("incorrect retrieval")
        
