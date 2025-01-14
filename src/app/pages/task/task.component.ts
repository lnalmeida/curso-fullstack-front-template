import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { NbDialogRef, NbDialogService, NbToastrService } from '@nebular/theme';
import { ResponseApp } from 'app/models/response';
import { StatusEnum, Task, TaskFilterEnum } from 'app/models/task';
import { User } from 'app/models/user';
import { TaskService } from 'app/services/task.service';
import { UserService } from 'app/services/user.service';
import { Ng2SmartTableComponent } from 'ng2-smart-table';
import { Row } from 'ng2-smart-table/lib/lib/data-set/row';
import { OperatorFunction } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'task',
  styleUrls: ['task.component.scss'],
  templateUrl: './task.component.html',
})
export class TaskComponent implements OnInit {
  @ViewChild('ng2TbTask') ng2TbTask: Ng2SmartTableComponent;
  @ViewChild('dialogTask') dialogTask: TemplateRef<any>;
  @ViewChild('dialogDelete') dialogDelete: TemplateRef<any>;

  dialogRef: NbDialogRef<any>;

  tbTaskData: Task[];
  tbTaskConfig: Object;
  taskSelected: Task;
  taskFilter: TaskFilterEnum;

  optionsStatus = [
    { value: StatusEnum.OPEN, name: 'Em aberto' },
    { value: StatusEnum.FINISHED, name: 'Concluído' },
  ]

  optionsResponsible: User[];

  // decaracao do formulário

  formTask = this.formBuilder.group({
    _id: [null],
    description: [null, Validators.required],
    status: [null, Validators.required],
    concluded: { value: null, disabled: true },
    responsible: [null, Validators.required],
    createdAt: { value: null, disabled: true },
  })

  constructor(private activatedRoute: ActivatedRoute,
              private router: Router,
              private formBuilder: FormBuilder,
              private dialogService: NbDialogService,
              private toastService: NbToastrService,
              private taskService: TaskService,
              private userService: UserService) {
    // Início do constructor
    this.setRouteReuse();
    this.setTaskFilter();
  }

  private setRouteReuse(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  private setTaskFilter(): void {
    this.activatedRoute.queryParams.subscribe((params: Params) => this.taskFilter = params.filter ? params.filter : TaskFilterEnum.ALL);
  }

  private setDataTbTask() {
    this.taskService.list(this.taskFilter).pipe(this.formatTaskResponse()).subscribe((res) => {
      this.tbTaskData = res;
    });
  }

  private formatTaskResponse(): OperatorFunction<ResponseApp<Task[]>, Task[]> {
    return map((tasks: ResponseApp<Task[]>) => tasks.body.map((task: Task) => new Task(task)));
  }

  ngOnInit(): void {
    this.setConfigTbTask();
    this.setDataTbTask();
    this.setTaskFilter();
  }

  private setConfigTbTask() {
    this.tbTaskConfig = {
      mode: 'external',
      actions: {
        columnTitle: 'Ações',
        add: false,
        position: 'right',
      },
      edit: {
        editButtonContent: '<span class="nb-edit" title="Editar"></span>',
      },
      delete: {
        deleteButtonContent: '<span class="nb-trash" title="Excluir"></span>',
      },
      noDataMessage: 'Nenhuma tarefa cadastrada.',
      columns: {
        statusTranslate: {
          title: 'Status',
        },
        description: {
          title: 'Descrição',
        },
        responsibleName: {
          title: 'Responsável',
        },
      },
    };
  }

  public openModalTask(event: Row) {
    this.userService.list().subscribe(((res) => {
      this.optionsResponsible = res.body;

      this.formTask.reset();
      this.formTask.get('status').patchValue(StatusEnum.OPEN);

      if (event) {
        const task: Task = event.getData();
        this.taskService.show(task._id).subscribe((res) => {
          this.formTask.patchValue(res.body);
        });
      }
      this.dialogRef = this.dialogService.open(this.dialogTask);
    }));
  }

  public openModalExclusion(event: Row) {
    this.taskSelected = event.getData();
    this.dialogRef = this.dialogService.open(this.dialogDelete, { context: this.taskSelected.description });
  }

  public btnSave() {
    if (this.formTask.invalid) return this.setFormInvalid();

    if (this.isAdd()) this.addTask();
    else this.editTask();
  }

  private addTask() {
    this.taskService.create(this.findFormAdd()).subscribe((res) => {
      this.tbTaskData.push(new Task(res.body));
      this.ng2TbTask.source.refresh();
      this.toastService.success('Tarefa cadastrada com sucesso', 'Sucesso!!!');
      this.dialogRef.close();
    });
  }

  private editTask() {
    this.taskService.update(this.formTask.value).subscribe((res) => {
      this.tbTaskData = this.tbTaskData.map((task: Task) => {
        if (task._id === this.formTask.value._id) return new Task(res.body);
        return task;
      });
      this.toastService.success('Tarefa editada com sucesso.', 'Sucesso!!!');
      this.dialogRef.close();
    });
  }

  private findFormAdd() {
    const task = this.formTask.value;
    delete task._id;

    return task;
  }

  private setFormInvalid() {
    this.toastService.warning('Existem um ou mais campos obrigatórios não preenchidos', 'Atenção!!!');
    this.formTask.get('status').markAsTouched();
    this.formTask.get('description').markAsTouched();
    this.formTask.get('responsible').markAsTouched();
  }

  private isAdd(): boolean {
    return !this.formTask.get('_id').value;
  }

  public findOperation(): string {
    return this.isAdd() ? 'Inclusão' : 'Edição';
  }

  public btnDelete() {
    this.taskService.delete(this.taskSelected._id).subscribe((res) => {
      try {
        this.tbTaskData = this.tbTaskData.filter(((task: Task) => task._id !== this.taskSelected._id));
        this.toastService.success('Tarefa excluída com sucesso.', 'Sucesso');
        this.dialogRef.close();
      } catch (error) {
        this.dialogRef.close();
      }
    });
  }

  public isTaskConcluded(): boolean {
    const concluded = this.formTask.get('concluded').value;
    return !concluded;
  }
}
