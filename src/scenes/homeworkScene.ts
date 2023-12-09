import { Composer, Markup, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { CustomContext, Homework, RawFileType } from "../../types/interfaces";
import { logger } from "../utils/logger";


export interface IHomeworkSceneController {
  getHomeworks: (ctx: CustomContext) => Promise<Homework[]>;
  sendSolution: (solution: solutionPayloadType) => Promise<boolean>;
}

export type solutionPayloadType = {
  token: string;
  files: RawFileType[];
  text: string;
  homeworkID: number;
  studentID: number;
  chatID: number;
};

export class HomeworkScene {
  controller: IHomeworkSceneController;
  scenes = {
    homeworks: {
      name: 'homeworks',
      description: 'Для просмотра домашних заданий и сдачи решений'
    }
  };

  constructor(controller: IHomeworkSceneController) {
    this.controller = controller;
  };

  initStage() {
    const chooseHomeworkStep = this.chooseHomeworkStep();
    const actionOnHomeworkStep = this.actionOnHomeworkStep();
    const sendSolutionStep = this.sendSolutionStep();

    const hwScene = new Scenes.WizardScene<CustomContext>(
      this.scenes.homeworks.name,
      this.startHomeworkStep.bind(this),
      chooseHomeworkStep,
      actionOnHomeworkStep,
      sendSolutionStep,
      this.replyExit.bind(this)
    );
    return new Scenes.Stage<CustomContext>([hwScene]);
  };

  private async startHomeworkStep(ctx: CustomContext) {
    ctx.wizard.state.homeworks = [];
    ctx.wizard.state.targetHomeworkID = -1;

    ctx.wizard.state.homeworks = await this.controller.getHomeworks(ctx);
    if (ctx.wizard.state.homeworks.length === 0) {
      await ctx.reply('У вас нет домашних заданий');
      return await ctx.scene.leave();
    }
    await ctx.reply(
      'Ваши домашнии задания',
      Markup.inlineKeyboard(ctx.wizard.state.homeworks.map(
        (hw) => {
          return Markup.button.callback(hw.title, 'homeworks/' + hw.homeworkid);
        }
      ), {
        columns: 1
      })
    );
    return ctx.wizard.next();
  }

  private chooseHomeworkStep(): Composer<CustomContext> {
    const handler = new Composer<CustomContext>();
    handler.action(
      /^homeworks\/(\d+)$/,
      async ctx => {
        const hw = ctx.wizard.state.homeworks.find(
          hw => hw.homeworkid === Number(ctx.match[1])
        );
        if (hw === undefined) {
          await ctx.editMessageText(
            'Упс, что-то пошло не так. Попробуйте позже.',
            Markup.inlineKeyboard([])
          );
          return this.replyExit(ctx);
        }
        ctx.wizard.state.targetHomeworkID = Number(ctx.match[1]);
        await ctx.editMessageText(
          `ДЗ: ${hw.title}\n` +
          `${hw.description}`,
          Markup.inlineKeyboard([
            Markup.button.callback('Сдать решение ☑️', 'solution'),
            Markup.button.callback('Показать полностью 📖', 'show'),
            Markup.button.callback('Выйти 🏃', 'exit'),
          ], {
            columns: 1
          })
        );
        return ctx.wizard.next();
      }
    );
    handler.on(
      "message",
      async ctx => {
        return this.replyExit(ctx);
      }
    );

    return handler;
  }

  private actionOnHomeworkStep(): Composer<CustomContext> {
    const handler = new Composer<CustomContext>();
    handler.action(
      'solution',
      async ctx => {
        ctx.wizard.state.curretSolution ??= {
          text: '',
          rawAttachList: []
        };
        await ctx.editMessageText(
          'Всё, что ты отправишь, будет добавлено в твоё решение\\. Как закончешь, нажми на кнопку *Отправить 📦*\\.\n' +
          'Обязательно дождишь сообжения `Сохранено`, чтобы быть уверенным, что твоё сообщение добавится в решение\\.\n' +
          'Записываю \\.\\.\\.',
          {
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard([
              Markup.button.callback('Отправить 📦', 'send'),
              Markup.button.callback('Выйти 🏃', 'exit'),
            ]),
          },
        );
        return ctx.wizard.next();
      }
    );
    handler.action(
      'show',
      async ctx => {
        const hw = ctx.wizard.state.homeworks.find(
          hw => hw.homeworkid === ctx.wizard.state.targetHomeworkID
        );
        if (hw === undefined) {
          await ctx.editMessageText(
            'Упс, что-то пошло не так. Попробуйте позже.',
            Markup.inlineKeyboard([])
          );
          return this.replyExit(ctx);
        }

        await ctx.editMessageText(
          'Полное условие ДЗ ' + hw.title + '\n' +
          hw.description,
          Markup.inlineKeyboard([])
        );

        for (let idx = 0; idx < hw.tasks.length; idx++) {
          const task = hw.tasks[idx];
          if (task.attachmenturlsList.length === 0) {
            await ctx.reply('Задача №' + (idx + 1) + '\n' + task.description);
            continue;
          }
          await ctx.replyWithMediaGroup(
            task.attachmenturlsList.map(
              (attach, id) => {
                return {
                  media: attach,
                  type: 'document',
                  caption: id === task.attachmenturlsList.length - 1 ?
                    'Задача №' + (idx + 1) + '\n' + task.description :
                    undefined,
                };
              }
            )
          );
        }
        return this.replyExit(ctx);
      }
    );
    handler.action(
      'exit',
      async ctx => {
        const evilSay = await fetch('https://evilinsult.com/generate_insult.php')
          .then(res => {
            return res.text();
          })
          .catch(() => '');
        await ctx.answerCbQuery(evilSay);
        return this.replyExit(ctx);
      }
    );
    handler.on(
      "message",
      async ctx => {
        return this.replyExit(ctx);
      }
    );
    return handler;
  }

  private sendSolutionStep(): Composer<CustomContext> {
    const handler = new Composer<CustomContext>();
    handler.on(
      message("document"),
      async ctx => {
        if (ctx.message.caption) {
          ctx.wizard.state.curretSolution.text += ctx.message.caption + '\n';
        }
        ctx.wizard.state.curretSolution.rawAttachList.push(
          {
            fileID: ctx.message.document.file_id,
            fileName: ctx.message.document.file_name,
            mimeType: ctx.message.document.mime_type,
          }
        );
        await ctx.reply('Сохранено');
      }
    );
    handler.on(
      message("photo"),
      async ctx => {
        const fileID = ctx.message.photo.pop()?.file_id;
        if (fileID === undefined) {
          logger.error('sendSolutionStep: fileID === undefined');
          return this.replyExitWithError(ctx);
        }

        if (ctx.message.caption) {
          ctx.wizard.state.curretSolution.text += ctx.message.caption + '\n';
        }
        ctx.wizard.state.curretSolution.rawAttachList.push(
          {
            fileID: fileID,
          }
        );
        await ctx.reply('Сохранено');
      }
    );
    handler.on(
      message('text'),
      async ctx => {
        ctx.wizard.state.curretSolution.text += ctx.message.text + '\n';
        await ctx.reply('Сохранено');
      }
    );
    handler.action(
      'send',
      async ctx => {
        if (ctx.wizard.state.curretSolution.text.endsWith('\n')) {
          ctx.wizard.state.curretSolution.text = ctx.wizard.state.curretSolution.text.slice(0, -1);
        }
        const res = await this.controller.sendSolution({
          token: ctx.telegram.token,
          files: ctx.wizard.state.curretSolution.rawAttachList,
          text: ctx.wizard.state.curretSolution.text,
          studentID: ctx.educrm.studentID,
          homeworkID: ctx.wizard.state.targetHomeworkID,
          chatID: ctx.educrm.chatID
        });
        if (!res) {
          return this.replyExitWithError(ctx);
        }
        await ctx.reply('Решение отправлено!');
        return this.replyExit(ctx);
      }
    );
    handler.action(
      'exit',
      async ctx => {
        await ctx.editMessageText(
          'Эххх, решение не отправлено 😢',
          Markup.inlineKeyboard([])
        );
        const evilSay = await fetch('https://evilinsult.com/generate_insult.php')
          .then(res => {
            return res.text();
          })
          .catch(() => '');
        await ctx.answerCbQuery(evilSay);
        return this.replyExit(ctx);
      }
    );
    handler.on(
      "message",
      async ctx => {
        await ctx.replyWithMarkdownV2(
          'В качетсве решения можно отправить *файл*, *фотографию* и *текст*\n' +
          'Для выхода нажмите на кнопку *Выход*'
        );
      }
    );
    return handler;
  }

  private async replyExitWithError(ctx: CustomContext) {
    await ctx.reply('Упс, что то пошло не так (╥﹏╥)');
    return this.replyExit(ctx);
  }

  private async replyExit(ctx: CustomContext) {
    await ctx.reply('Возврат к обмену сообщениями.');
    return await ctx.scene.leave();
  }

}
