#django imports
from django.contrib.auth.decorators import login_required, permission_required, user_passes_test
from django.contrib.auth.mixins import PermissionRequiredMixin, UserPassesTestMixin
from django.db.models import Case, Count, Q, Sum, When
from django.forms import formset_factory
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.views import View

#my imports
from .models import *
from .my_utilities import *
from .forms import *

#python imports
from json import dumps as json_dumps
from datetime import datetime, timedelta, date
from decimal import *
#import pandas as pd
import functools
import csv

# Create your views here.

FORM_1 = 'Systems'
FORM_2 = 'Subsystems'
FORM_3 = '*'

#@user_passes_test(lambda u: u.is_staff, login_url="login")
class SubmissionsView(UserPassesTestMixin, View):
    template_name = 'submissions.html'
    datatable = ''
    def __init__(self, datatable):
        self.datatable = datatable
    
    def get(self, request):
        context = {
            'retrieve_date_weekly': jsonfilt(getDateSun(datetime.today()).strftime("%b %d, %Y")),
            'retrieve_date_daily': jsonfilt((getDateSun(datetime.today())+timedelta(days=6)).strftime("%a %b %d, %Y")),
            'weekly_submissions': self.load_submissions()['submissions'],
            'daily_submissions': self.load_submissions_daily()['submissions'],
            'names': jsonfilt(self.getNames()),
        }
        return render(request, self.template_name, context)
    
    def post(self, request):
        try:
            if(request.POST.get('data') == 'refresh'):
                date_str = request.POST.get('date')
                table = request.POST.get('table')

                if table == 'weekly_submit':
                    retrieve_date = getDateSun(datetime.strptime(date_str, "%b %d, %Y"))
                elif table == 'daily_submit':
                    retrieve_date = datetime.strptime(date_str, "%a %b %d, %Y")

                if request.POST.get('direction') == 'prev':
                    if table == 'weekly_submit':
                        return JsonResponse(self.load_submissions(retrieve_date-timedelta(days=7)))
                    return JsonResponse(self.load_submissions_daily(retrieve_date-timedelta(days=1)))
                elif request.POST.get('direction') == 'next':
                    if table == 'weekly_submit':
                        return JsonResponse(self.load_submissions(retrieve_date+timedelta(days=7)))
                    return JsonResponse(self.load_submissions_daily(retrieve_date+timedelta(days=1)))

            elif(request.POST.get('data') == 'retrieve'):          
                form_date = getDateSun(datetime.strptime(request.POST['date'],"%b %d, %Y")).strftime("%Y-%m-%d")
                form_user = request.POST['user']
                form_type = self.datatable
                form_table = 'submit'
                request.session['retrieve_form'] = {'date': form_date, 'type': form_type, 'table': form_table, 'user': form_user}
                if self.datatable == FORM_1:
                    #print(redirect('security_form'))
                    #print(redirect(SystemsFormReadOnlyView.as_view()))
                    return redirect('security_form_view')
                elif self.datatable == FORM_3:
                    return redirect('detector_form_view')
        except:
            return HttpResponse()
            
    def getNames(self):
        names = {}
        if self.datatable == FORM_1:
            for user in User.objects.values_list('first_name', 'last_name', 'username').filter(groups__name='Systems Manufacturing'):
                names[user[2]] = "%s %s" % (user[0], user[1])
        if self.datatable == FORM_3:
            for user in User.objects.values_list('first_name', 'last_name', 'username').filter(Q(groups__name='* Manufacturing') | Q(groups__name='* Manufacturing')):
                names[user[2]] = "%s %s" % (user[0], user[1])
        return names

    def load_submissions_daily(self, retrieve_date=getDateSun(datetime.today())+timedelta(days=6)):
        submissions = {}
        start_date = datetime.strptime("2019-02-24","%Y-%m-%d")
        if retrieve_date > getDateSun(datetime.today())+timedelta(days=6):
            retrieve_date = getDateSun(datetime.today())+timedelta(days=6)
        delta = int((retrieve_date - start_date).days)
        if delta < 0: 
            retrieve_date = start_date
            delta = 0
        index = 0
        for i in range(0, delta+1):
            idate = retrieve_date-timedelta(days=index)
            if self.datatable == FORM_1:
                hours = self.systems_daily(idate)
            elif self.datatable == FORM_3:
                hours = self.detector_daily(idate)
            submissions[idate.strftime("%a %b %d, %Y")] = {}
            for user in list(hours):
                initial = submissions[idate.strftime("%a %b %d, %Y")].get(user[2], [])
                initial.append(float(user[3]))
                submissions[idate.strftime("%a %b %d, %Y")][user[2]] = initial
            if index >= 12:
                break
            index+=1
        context = {
            'retrieve_date': jsonfilt(retrieve_date.strftime("%a %b %d, %Y")),
            'submissions': jsonfilt(submissions),
        }
        return context

    def load_submissions(self, sun_date=getDateSun(datetime.today())):
        names = {}
        if self.datatable == FORM_1:
            for user in User.objects.values_list('first_name', 'last_name', 'username').filter(groups__name='Systems Manufacturing'):
                names[user[2]] = "%s %s" % (user[0], user[1])
        if self.datatable == FORM_3:
            for user in User.objects.values_list('first_name', 'last_name', 'username').filter(Q(groups__name='* Manufacturing')|Q(groups__name='* Manufacturing')):
                names[user[2]] = "%s %s" % (user[0], user[1])
        submissions = {}
        start_date = datetime.strptime("2019-02-24","%Y-%m-%d")
        if sun_date > getDateSun(datetime.today()):
            sun_date = getDateSun(datetime.today())
        delta = int((sun_date - start_date).days/7)
        if delta < 0: 
            sun_date = start_date
            delta = 0
        index = 0
        for i in range(0, delta+1):
            idate = sun_date-timedelta(days=i*7)
            if self.datatable == FORM_1:
                hours = self.systems(idate)
            elif self.datatable == FORM_3:
                hours = self.detector(idate)
            submissions[idate.strftime("%b %d, %Y")] = {}
            for user in list(hours):
                initial = submissions[idate.strftime("%b %d, %Y")].get(user[2], [])
                initial.append(float(user[3]))
                submissions[idate.strftime("%b %d, %Y")][user[2]] = initial
            if index >= 12:
                break
            index+=1
        context = {
            'retrieve_date': jsonfilt(sun_date.strftime("%b %d, %Y")),
            'submissions': jsonfilt(submissions),
            'names': jsonfilt(names)
        }
        return context

    def systems(self, idate):
        return User.objects.values_list('first_name', 'last_name', 'username').filter(groups__name='Systems Manufacturing').annotate(hours=Sum(Case(When(SystemLabor__task_date__range=[idate, idate+timedelta(days=6)], then='SystemLabor__hrs'), default=0))).order_by('last_name','first_name')

    def systems_daily(self, idate):
        return User.objects.values_list('first_name', 'last_name', 'username').filter(groups__name='Systems Manufacturing').annotate(hours=Sum(Case(When(SystemLabor__task_date=idate, then='SystemLabor__hrs'), default=0))).order_by('last_name','first_name')

    def detector(self, idate):
        return User.objects.values_list('first_name', 'last_name', 'username').filter(Q(groups__name='Detector Manufacturing')|Q(groups__name='* Manufacturing')).annotate(hours=Sum(Case(When(DetectorLabor__task_date__range=[idate, idate+timedelta(days=6)], then='DetectorLabor__hrs'), default=0))).order_by('last_name','first_name')

    def detector_daily(self, idate):
        return User.objects.values_list('first_name', 'last_name', 'username').filter(Q(groups__name='Detector Manufacturing')|Q(groups__name='* Manufacturing')).annotate(hours=Sum(Case(When(DetectorLabor__task_date=idate, then='DetectorLabor__hrs'), default=0))).order_by('last_name','first_name')

    def test_func(self):
        return self.request.user.is_staff

def home(request):
    return render(request, 'home.html')

@user_passes_test(lambda u: u.is_staff, login_url="login")
def management(request):
    return render(request, 'management.html')

'''
(Legacy)
Detection Components visualization using D3.js instead of MS Power BI
'''
@user_passes_test(lambda u: u.is_staff, login_url='login')
def detector_analyze(request):
    entries = DetectorLabor.objects.all().order_by('task_date')
    tasks = DetectorTasks.objects.all()
    operators = {}#systems dict of serials dict of lists; 'serial': ['ops', 'team_members', 'start_date', 'recent_date']
    data = []
    startDate = getDateSun(entries[0].task_date)
    weeks = (getDateSun(entries[len(entries)-1].task_date) - startDate).days / 7 + 1
    #clientData = {}
    clientData = []
    clientTasks = set()
    clientUsers = set()
    clientRoutings = [[t.task, t.pn, t.qty, t.min_SAP] for t in tasks]
    for entry in entries:
        dataNode = {
            'x': {'week': getDateSun(entry.task_date).strftime("%Y-%m-%d")},
            'y': {'hrs': round(float(entry.hrs),1), 'qty': entry.qty},
            'params': {'task': entry.task, 'user': str(entry.created_by)},
        }
        clientData.append(dataNode)
        clientTasks.add(entry.task)
        clientUsers.add(str(entry.created_by))
    '''
    for entry in entries:
        clientData_user = clientData.get(str(entry.created_by))
        if not clientData_user:
            clientData_user = clientData[str(entry.created_by)] = {}
        clientData_user_task = clientData_user.get(entry.task)
        if not clientData_user_task:
            clientData_user_task = clientData_user[entry.task] = {}
            clientTasks.append(entry.task)
        clientData_user_task_week = clientData_user_task.get(getDateSun(entry.task_date).strftime("%Y-%m-%d"))
        if not clientData_user_task_week:
            clientData_user_task_week = clientData_user_task[getDateSun(entry.task_date).strftime("%Y-%m-%d")] = [0,0]
        clientData_user_task_week[0] += entry.qty
        clientData_user_task_week[1] += round(float(entry.hrs), 1)
    '''
    print(clientData)
    if request.method == 'POST':
        if request.POST.get('data') == 'compiled':
            csvfile = tableToCSV(DetectorLabor.objects.all(), True)
            #csvfiles = dlistToCSV(data, True)
            zipped = zipFiles([("rawdata", csvfile, ".csv")]).getvalue()# + csvfiles).getvalue()
            if zipped:
                response = HttpResponse(zipped, content_type='application/x-zip-compressed')
                response['Content-Disposition'] = 'attachment; filename=testzip.zip'
                return response
        return
    
    context = {
        'clientData': jsonfilt(clientData),
        'routings': jsonfilt(clientRoutings),
        'allTasks': jsonfilt(list(clientTasks)),
        'allUsers': jsonfilt(list(clientUsers)),
        'startDate': jsonfilt(startDate.strftime("%Y-%m-%d")),
        'nweeks': jsonfilt(int(weeks)),
    }
    return render(request, 'detector_analyze.html', context)

'''
(Incomplete)
Detections Systems page with embedded MS Power BI (using Power BI REST API)
'''
@user_passes_test(lambda u: u.is_staff, login_url='login')
def systems_analyze(request):
    import adal
    import json
    #import pyodbc
    import requests
    
    #AUTHORITY_URL = ‘https://login.windows.net/<TenantID,Name or Common>’#Check which works in your case. You will find this in AAD
    RESOURCE = 'https://analysis.windows.net/powerbi/api'
    CLIENT_ID = '*'
    CLIENT_SECRET = '*'
    proxies = {'localhost:8003'}#replace the text with your proxy if you need to go through the proxy to access the api link.
    completedtime = []
    verify = []

    def make_headers(access_token):
        return {
            'Authorization': 'Bearer {}'.format(access_token)
        }
    context = adal.AuthenticationContext('*')
    token = context.acquire_token_with_client_credentials(RESOURCE,client_id=CLIENT_ID,client_secret=CLIENT_SECRET)
    #Now you can get the accesstoken easily.
    access_token = token['accessToken']
    context = {
        'access_token':jsonfilt(access_token),
        'id': jsonfilt(CLIENT_ID)    
    }
    return render(request, 'embed_analyze.html', context)

'''
(Legacy)
Detection Systems visualization using D3.js instead of MS Power BI
'''
@user_passes_test(lambda u: u.is_staff, login_url='login')
def form_analyze(request):   
    system_fields = getSystemFields()
    wtype_fields = getWTypeFields()
    entries = SystemLabor.objects.exclude(Q(system=system_fields[0])|Q(system=system_fields[3]))
    squads = getSquads()
    systems = {}#systems dict of serials dict of lists; 'serial': ['ops', 'team_members', 'start_date', 'recent_date']
    data = []
    for entry in entries:
        op_fields = getOpFields(entry.system)

        if systems.get(entry.system):
            initial = systems[entry.system].get(entry.serial)
        else:
            systems[entry.system] = {}
            initial = None
        if initial == None:
            systems[entry.system][entry.serial] = [
                {k: {'hours':0,'start_date':{w: '' for w in wtype_fields},'recent_date':{w: '' for w in wtype_fields}} for k in op_fields}, 
                {k: 0 for k in wtype_fields}, 
                squads.get(entry.created_by.username, ''), 
                entry.task_date.strftime('%Y-%m-%d'), 
                entry.task_date.strftime('%Y-%m-%d'),
            ]
            systems[entry.system][entry.serial][0][entry.op]['hours'] = Decimal(entry.hrs)
            systems[entry.system][entry.serial][0][entry.op]['start_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')
            systems[entry.system][entry.serial][0][entry.op]['recent_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')
            systems[entry.system][entry.serial][1][entry.work_type] = Decimal(entry.hrs)
        else:
            ops = initial[0]
            wtypes = initial[1]

            ops[entry.op]['hours'] = ops[entry.op]['hours'] + Decimal(entry.hrs)
            if not ops[entry.op]['start_date'][entry.work_type]:
                ops[entry.op]['start_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')
                ops[entry.op]['recent_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')
            else:
                if entry.task_date < date.fromisoformat(ops[entry.op]['start_date'][entry.work_type]):
                    ops[entry.op]['start_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')
                if entry.task_date > date.fromisoformat(ops[entry.op]['recent_date'][entry.work_type]):
                    ops[entry.op]['recent_date'][entry.work_type] = entry.task_date.strftime('%Y-%m-%d')

            wtypes[entry.work_type] = wtypes[entry.work_type] + Decimal(entry.hrs)
            if squads.get(entry.created_by.username, '') in initial[2]:
                team_members = initial[2]
            else:
                if initial[2] == '':
                    team_members = squads.get(entry.created_by.username, '')
                else:
                    team_members = initial[2] + ', ' + squads.get(entry.created_by.username, '')
                #team_members.append(entry.created_by.username)
            if entry.task_date < date.fromisoformat(initial[3]):
                start_date = entry.task_date.strftime('%Y-%m-%d')
            else:
                start_date = initial[3]
            if entry.task_date > date.fromisoformat(initial[4]):
                recent_date = entry.task_date.strftime('%Y-%m-%d')
            else:
                recent_date = initial[4]
            team = 'A'
            systems[entry.system][entry.serial] = [ops, wtypes, team_members, start_date, recent_date, entry.serial]
            
        #systems[entry.task] = [systems.get(entry.task, [0, [entry.created_by]])[0] + entry.hrs, systems.get(entry.task, [entry.hrs, entry.created_by])[1]]
    #serial_keys = sorted(systems[])
    arr_systems = []
    data = {}
    for systems_key in systems.keys():
        keys = sorted(systems[systems_key].keys())
        data[systems_key] = []
        for key in keys:
            data[systems_key].append({
                    "serial": key,
                    **{k: float(v['hours']) for k, v in systems[systems_key][key][0].items()},
                    **{k: float(v) for k, v in systems[systems_key][key][1].items()},
                    "duration": (date.fromisoformat(systems[systems_key][key][4])-date.fromisoformat(systems[systems_key][key][3])).days,
                    "team_members": systems[systems_key][key][2],
                    "start_date": systems[systems_key][key][3],
                    "recent_date": systems[systems_key][key][4],
                    "op_dates": {k: [v['start_date'],v['recent_date']] for k, v in systems[systems_key][key][0].items()},
                })
            #arr_systems.append(systems[key])
    if request.method == 'POST':
        if request.POST.get('data') == 'compiled':
            csvfile = tableToCSV(SystemLabor.objects.all(), True)
            csvfiles = dlistToCSV(data, True)
            zipped = zipFiles([("rawdata", csvfile, ".csv")] + csvfiles).getvalue()
            if zipped:
                response = HttpResponse(zipped, content_type='application/x-zip-compressed')
                response['Content-Disposition'] = 'attachment; filename=testzip.zip'
                return response
        return

    data_keys = {k: getOpFields(k) for k in getSystemFields()[1:3]}#{"ANCP00": getOpFields("ANCP00"), "ANRR00": getOpFields("ANRR00")}
    context = {

        "dataset": data,
        "data_keys": jsonfilt(data_keys),
        "wtype_fields": jsonfilt(wtype_fields),
    }
    #return render(request, 'test-analyze2.html', context)
    return render(request, 'form_analyze.html', context)

class FormView(View):
    template_name = ''
    datatable = ''
    submit = True
    disable = False

    def __init__(self):
        self.error = False
        super().__init__()

    def get(self, request):
        retrieved = request.session.get('retrieve_form')
        extra_rows = 10
        entries = None
        if retrieved:
            del request.session['retrieve_form']
            retrieve_date = datetime.strptime(retrieved['date'], "%Y-%m-%d")
            entries = retrieve_form(retrieve_date, self.datatable, 'submit', request.user)

        if not entries:
            retrieve_date = getDateSun(datetime.today())
            entries = retrieve_form(retrieve_date, self.datatable, 'submit', request.user)

        all_initial_dicts = self.makeInitial(entries, retrieve_date)
        all_forms = self.createForms(request.user, retrieve_date=retrieve_date, initial_dicts=all_initial_dicts, extra_rows=extra_rows)
        return self.renderForm(request, all_forms)

    def post(self, request):
        if request.POST.get('data') == 'connect':
            return HttpResponse()
        all_forms = self.createForms(request.user, post_data=request.POST)
        if self.createEntries(request.user, all_forms):
            return redirect('profile')
        return self.renderForm(request, all_forms)

    def createEntries(self, user, all_forms):
        for form in all_forms:
            if not form.is_valid():
                return False
        date_form = all_forms[0]
        formsets = all_forms[1:]
        sun_date = getDateSun(date_form.cleaned_data['date'])
        create_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        submitted = False
        formsetnum = 0
        for formset in formsets:
            formnum = 0
            rownum = 0
            for form in formset:
                empty = True
                for v in form.cleaned_data.values():
                    if v:
                        empty = False
                if empty:
                    if self.handleEmpty(formsetnum):
                        rownum += 1
                    continue
                if self.createEntryFields(user, sun_date, create_time, form, formnum, formsetnum, rownum):            
                    submitted = True
                formnum+=1
                rownum+=1
            formsetnum+=1
        if submitted:
            self.deletePreviousEntries(user, sun_date, create_time)
        return True

    def createForms(self, user, post_data=None, retrieve_date=None, initial_dicts=[], extra_rows=10):
        date_form = dateForm(post_data, user=user, req=self.submit,initial={'date': retrieve_date})
        formsets = self.createFormsets(user, post_data, initial_dicts, extra_rows)
        return [date_form] + formsets

    def handleEmpty(self, formsetnum):
        return False

    def makeInitial(self, entries, retrieve_date):
        return [[]]

    def renderForm(self, request, all_forms):
        i = 0
        formsets = {}
        for formset in all_forms[1:]:
            formsets["formset_%d" % i] = formset
            i+=1
        context = {
            "date_form": all_forms[0],
            **formsets,
            **self.getContextData(),
            "error": jsonfilt(all_forms[0].is_bound),
            'disable': jsonfilt(self.disable),
        }
        #printformsets['formset_']
        return render(request, self.template_name, context)

class SystemsFormView(PermissionRequiredMixin, FormView):
    permission_required = 'labortracker.manufacturing_systems_form'
    template_name = 'security_form.html'
    datatable = FORM_1

    def __init__(self):
        super().__init__()

    def createEntryFields(self, user, sun_date, create_time, form, formnum, formsetnum, rownum):
        submitted = False
        fields_raw = form.fields
        serial = ""
        system = ""
        op = ""
        wtype = ""
        com = ""
        index = -1
        for field in fields_raw:
            input = form.cleaned_data[field]
            if field[0:3] == "sys":
                system = input
            elif field[0:3] == "sns": #if contains S/N, only use int value
                serial = input
            elif field[0:3] == "ops":
                op = input
            elif field[0:3] == "wty":
                wtype = input
            elif field[0:3] == "com":
                com = input
            elif field[0:3] == "tal":
                index+=1                   
                if input == 0 or input == "" or input == None:
                    continue 
                if system == "OTHER":
                    serial = ""
                    op = ""
                    wtype = ""
                sys = SystemLabor.objects.create(
                    created_by = user,
                    created_on = create_time,
                    serial = serial,
                    op = op,
                    work_type = wtype,
                    task_date = (sun_date + timedelta(days=index)).strftime("%Y-%m-%d"),
                    hrs = input,
                    system = system,
                    form_row = formnum,
                    comments = com,
                )
                submitted = True
        return submitted

    def createFormsets(self, user, post_data=None, initial_dicts=[], extra_rows=10):
        SecurityFormset = formset_factory(SecurityForm, extra=extra_rows, can_delete=True)
        return [SecurityFormset(post_data, form_kwargs={'user': user, 'req': self.submit},initial=(initial_dicts[0] if len(initial_dicts) > 0 else []))]

    def deletePreviousEntries(self, user, sun_date, create_time):
        SystemLabor.objects.filter(created_by=user).filter(task_date__range=[sun_date, sun_date+timedelta(days=6)]).filter(created_on__lt=create_time).delete()

    def getContextData(self):
        return {
            "systemFields": jsonfilt(SecurityForm.systemFields),
            "opFields": jsonfilt(SecurityForm.opFields),
            "wtypeFields": jsonfilt(SecurityForm.wtypeFields),
        }
    
    def makeInitial(self, entries, retrieve_date):
        initial_dicts = []
        if entries:
            row = -1
            for entry in entries:
                while entry.form_row > row:
                    initial_dicts.append({})
                    row += 1
                if entry.form_row == row:
                    dict_row = initial_dicts[row]
                    if dict_row == {}:
                        dict_row['sys_0'] = entry.system
                        if entry.serial != "":
                            dict_row['sns_0'] = entry.serial.zfill(4)
                        dict_row['ops_0'] = entry.op
                        dict_row['wty_0'] = entry.work_type
                        dict_row['com_0'] = entry.comments
                    index = (entry.task_date - retrieve_date.date()).days
                    if entry.hrs != 0:
                        dict_row['tal_'+str(index)] = entry.hrs
        else:
            return []
        return [initial_dicts]

class SystemsFormReadOnlyView(UserPassesTestMixin, SystemsFormView):
    disable = True
    
    def __init__(self):
        super().__init__()

    def post(self, request):
        return redirect(home)

    def get(self, request):
        retrieved = request.session.get('retrieve_form')
        if retrieved:
            del request.session['retrieve_form']
            if type(retrieved['user']) == str:
                retrieved['user'] = User.objects.get(username=retrieved['user'])
                self.disable = "%s %s" % (retrieved['user'].first_name, retrieved['user'].last_name)
            retrieve_date = datetime.strptime(retrieved['date'], "%Y-%m-%d")
            extra_rows = 10
            entries = retrieve_form(retrieve_date, retrieved['type'], retrieved['table'], retrieved['user'])
            if entries:
                extra_rows = 1
            all_initial_dicts = self.makeInitial(entries, retrieve_date)
            all_forms = self.createForms(request.user, retrieve_date=retrieve_date, initial_dicts=all_initial_dicts, extra_rows=extra_rows)
            return self.renderForm(request, all_forms)       
        return redirect(home)

    def test_func(self):
        return self.request.user.is_staff

class DetectorFormView(PermissionRequiredMixin, FormView):
    permission_required = 'labortracker.manufacturing_*_form'
    template_name = '*_form.html'
    divertedLaborTasks = getDetDivFields()
    nsLabTasks = getDetNSFields()
    datatable = FORM_3

    def __init__(self):
        super().__init__()

    def createEntryFields(self, user, sun_date, create_time, form, formnum, formsetnum, rownum):
        submitted = False
        fields_raw = form.fields
        task = ""
        com = ""
        wtype = "PRODUCTION"
        wrkOrd = ""
        taq = ""
        index = -1
        if formsetnum == 0:
            task = self.divertedLaborTasks[rownum]
            wtype = "DIVERTED"
            formnum = 0
        elif formsetnum == 1:
            task = self.nsLabTasks[rownum]
            wtype = "*"
            formnum = 0
        for field in fields_raw:
            input = form.cleaned_data[field]
            if field[0:3] == "tas":
                task = input
            elif field[0:3] == "com":
                com = input
            elif field[0:3] == "wrk":
                wrkOrd = input
            elif field[0:3] == "taq":
                taq = input
            elif field[0:3] == "tal":
                tal = input
                index+=1
                if wrkOrd == "" or wrkOrd == None:
                    wrkOrd = 0
                if tal == "" or tal == None:
                    tal = 0 
                if taq == "" or taq == None:
                    taq = 0                   
                if tal == 0:
                    continue
                det = DetectorLabor.objects.create(
                    created_by = user,
                    created_on = create_time,
                    task = task,
                    labor_type = wtype,
                    task_date = (sun_date + timedelta(days=index)).strftime("%Y-%m-%d"),
                    hrs = tal,
                    qty = taq,
                    form_row = formnum,
                    comments = com,
                    wrkOrd = wrkOrd,
                )
                submitted = True
        return submitted

    def createFormsets(self, user, post_data=None, initial_dicts=[], extra_rows=10):
        formsets = []
        DetectorDivFormset = formset_factory(DetectorDivForm, extra=(0 if len(initial_dicts) > 0 else len(self.divertedLaborTasks)), can_delete=False)
        DetectorNSFormset = formset_factory(DetectorDivForm, extra=(0 if len(initial_dicts) > 1 else len(self.nsLabTasks)), can_delete=False)
        DetectorProdFormset = formset_factory(DetectorProdForm, extra=extra_rows, can_delete=True)
        formsets.append(DetectorDivFormset(post_data, form_kwargs={'user': user, 'req': self.submit}, initial=(initial_dicts[0] if len(initial_dicts) > 0 else []), prefix="divForm"))
        formsets.append(DetectorNSFormset(post_data, form_kwargs={'user': user, 'req': self.submit}, initial=(initial_dicts[1] if len(initial_dicts) > 1 else []), prefix="nsForm"))
        formsets.append(DetectorProdFormset(post_data, form_kwargs={'user': user, 'req': self.submit}, initial=(initial_dicts[2] if len(initial_dicts) > 2 else []), prefix="prodForm"))
        return formsets

    def deletePreviousEntries(self, user, sun_date, create_time):
        DetectorLabor.objects.filter(created_by=user).filter(task_date__range=[sun_date, sun_date+timedelta(days=6)]).filter(created_on__lt=create_time).delete()

    def getContextData(self):
        tasks = DetectorTasks.objects.all()
        tarr = [task[0] for task in DetectorProdForm.tarr]#list(map(lambda x: x.task, tasks))
        #parr = DetectorProdForm.parr#list(map(lambda x: x.pn, tasks))
        parr = sorted(list(set(part[0] for part in DetectorProdForm.parr)))
        tdict = {}
        pdict = {}
        add_dict = {item: (item, item, item) for item in DetectorProdForm.additional}
        for t in tasks:
            tdict[t.task] = (t.task, t.pn, t.descr)
            
            if pdict.get(t.pn) == None:
                pdict[t.pn] = (t.task, t.pn, t.descr)

        return {
            'tasks': jsonfilt({**tdict, **add_dict}),
            'parts': jsonfilt({**pdict, **add_dict}),
            'tarr': jsonfilt(tarr),
            'parr': jsonfilt(parr),
            'divFields': jsonfilt(self.divertedLaborTasks),
            'nsFields': jsonfilt(self.nsLabTasks),
        }

    def handleEmpty(self, formsetnum):
        return formsetnum == 0 or formsetnum == 1

    def makeInitial(self, entries, retrieve_date):

        def makeProd():
            dict_row = initial_dicts[formRow]
            if dict_row == {}:
                dict_row['tas_0'] = entry.task
                if entry.wrkOrd == 0:
                    dict_row['wrk_0'] = ''
                else:
                    dict_row['wrk_0'] = entry.wrkOrd
                dict_row['com_0'] = entry.comments
            index = (entry.task_date - retrieve_date.date()).days
            if entry.hrs != 0:
                dict_row['tal_'+str(index)] = entry.hrs
            if entry.qty != 0:
                dict_row['taq_'+str(index)] = entry.qty

        initial_dicts_div = []
        initial_dicts_ns = []
        initial_dicts_prod = []
        obsolete_entries = []
        if entries:
            row = -1
            
            for i in range(0, len(self.divertedLaborTasks)):
                        initial_dicts_div.append({})
            for i in range(0, len(self.nsLabTasks)):
                        initial_dicts_ns.append({})   

            for entry in entries:
                
                if entry.task in self.divertedLaborTasks:
                    formRow = self.divertedLaborTasks.index(entry.task)
                    initial_dicts = initial_dicts_div
                    
                elif entry.task in self.nsLabTasks:
                    formRow = self.nsLabTasks.index(entry.task)
                    initial_dicts = initial_dicts_ns
                    
                else:
                    formRow = entry.form_row
                    initial_dicts = initial_dicts_prod
                    if entry.labor_type != 'PRODUCTION':
                        obsolete_entries.append(entry)
                        continue
                    while formRow > row:
                        initial_dicts.append({})
                        row += 1
                makeProd()
            for entry in obsolete_entries:
                initial_dicts = initial_dicts_prod
                formRow = len(initial_dicts)
                initial_dicts.append({})
                makeProd()
        else:
            return []
        return [initial_dicts_div, initial_dicts_ns, initial_dicts_prod]

class DetectorFormReadOnlyView(UserPassesTestMixin, DetectorFormView):
    disable = True
    
    def __init__(self):
        super().__init__()

    def post(self, request):
        return redirect(home)

    def get(self, request):
        retrieved = request.session.get('retrieve_form')
        if retrieved:
            del request.session['retrieve_form']
            if type(retrieved['user']) == str:
                retrieved['user'] = User.objects.get(username=retrieved['user'])
                self.disable = "%s %s" % (retrieved['user'].first_name, retrieved['user'].last_name)
            retrieve_date = datetime.strptime(retrieved['date'], "%Y-%m-%d")
            extra_rows = 10
            entries = retrieve_form(retrieve_date, retrieved['type'], retrieved['table'], retrieved['user'])
            if entries:
                extra_rows = 1
            all_initial_dicts = self.makeInitial(entries, retrieve_date)
            all_forms = self.createForms(request.user, retrieve_date=retrieve_date, initial_dicts=all_initial_dicts, extra_rows=extra_rows)
            return self.renderForm(request, all_forms)       
        return redirect(home)

    def test_func(self):
        return self.request.user.is_staff

def retrieve_form(form_date, form_type, form_table, user):
    ret = []
    form_enddate = form_date + timedelta(days=6)
    if form_table == 'save':
        if form_type.upper() == FORM_1.upper():
            ret = SavedLabor.objects.filter(created_by=user).filter(task_date__range=[form_date, form_enddate])
        elif form_type.upper() == FORM_3.upper():
            ret = DetectorSavedLabor.objects.filter(created_by=user).filter(task_date__range=[form_date, form_enddate])
    elif form_table == 'submit':
        if form_type.upper() == FORM_1.upper():
            ret = SystemLabor.objects.filter(created_by=user).filter(task_date__range=[form_date, form_enddate])
        elif form_type.upper() == FORM_3.upper():
            ret = DetectorLabor.objects.filter(created_by=user).filter(task_date__range=[form_date, form_enddate])

    if len(ret) == 0:
        return []
    return ret

class DetectorSettingsView(UserPassesTestMixin, View):
    routingHeaders = [header.name for header in DetectorTasks._meta.fields][1:7]
    
    def __init__(self):
        super().__init__()
    
    def get(self, request):
        form = FileUploadForm()
        context = {
            "form": form,
            "routings_headers": self.routingHeaders,
        }
        return render(request, 'management_settings.html', context)

    def post(self, request):
        if request.POST.get('data') == 'routings':
            csvfile = tableToCSV(DetectorTasks.objects.all().order_by('id'), True, [1,2,3,4,5,6], delimiter=',')
            zipped = zipFiles([("routings", csvfile, ".txt")]).getvalue()
            if zipped:
                response = HttpResponse(zipped, content_type='application/x-zip-compressed')
                response['Content-Disposition'] = 'attachment; filename=testzip.zip'
                return response
        elif request.FILES.get('file'):
            form = FileUploadForm(request.POST, request.FILES)
            if form.is_valid():
                if self.importCSVFile(request.FILES['file']):
                    DetectorProdForm.refreshData()
                    return HttpResponse('success')
        return HttpResponse('error')

    def importCSVFile(self,file):
        objects = []
        create_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for chunk in file.chunks():
            try:
                strFile = io.StringIO(chunk.decode())
            except UnicodeDecodeError:
                try:
                    strFile = io.StringIO(chunk.decode('ISO-8859-1'))
                except UnicodeDecodeError:
                    print('UnicodeDecodeError')
                    return False
            reader = csv.reader(strFile)
            i = 0
            for row in reader:
                if len(row) < len(self.routingHeaders):
                    if len(row) == 0:
                        continue
                    return False
                if row[0] == '' or row[1] == '' or row[2] == '':
                    continue
                objects.append(DetectorTasks(task=row[0],pn=row[1],descr=row[2],system=row[3],qty=row[4] or 0,min_SAP=row[5] or 0,created_on=create_time))
        try:
            DetectorTasks.objects.bulk_create(objects[1:])
        except ValueError:
            print('ValueError')
            return False
        DetectorTasks.objects.filter(created_on__lt=create_time).delete()
        return True

    def test_func(self):
        return self.request.user.is_staff
        
@login_required
def profile(request):
    user = request.user

    if request.method == "POST":
        form = ProfileForm(request.POST, user=user)

    else:
        form = ProfileForm(user=user)

    submits_json = form.submits_json
    if form.is_valid():
        form_date = form.cleaned_data['date'].strftime("%Y-%m-%d")
        form_type = form.cleaned_data['type']
        form_table = form.cleaned_data['table']
        request.session['retrieve_form'] = {'date': form_date, 'type': form_type, 'table': form_table} #retrieve_form(form_date, form_type, form_table, user)
        if form_type.upper() == FORM_1.upper():
            return redirect('security_form')
        elif form_type.upper() == FORM_3.upper():
            return redirect('detector_form')

    context = {
        "form": form,
        "submits": jsonfilt(submits_json),
    }
    return render(request, 'profile.html', context)
