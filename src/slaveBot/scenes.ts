import { Composer, Markup, Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { CustomContext, Homework } from "../../types/interfaces";
import { logger } from "../utils/logger";


export interface IHomeworkSceneController {
  getHomeworks: (ctx: CustomContext) => Promise<Homework[]>;
  sendSolution: (solution: solutionPayloadType) => Promise<boolean>;
}

export type solutionPayloadType = {
  token: string;
  file: {
    fileID: string;
    fileName?: string;
    mimeType?: string;
  };
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
    ctx.wizard.state.waitSolution = false;

    ctx.wizard.state.homeworks = await this.controller.getHomeworks(ctx);
    console.log(JSON.stringify(ctx.wizard.state.homeworks, null, 4));
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
      ))
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
            Markup.button.callback('Выйти 🏃', 'exit'),
          ])
        );
        // TODO добавить атачи
        return ctx.wizard.next();
      }
    );

    return handler;
  }

  private actionOnHomeworkStep(): Composer<CustomContext> {
    const handler = new Composer<CustomContext>();
    handler.action(
      'solution',
      async ctx => {
        ctx.wizard.state.waitSolution = true;
        await ctx.editMessageText(
          'Жду твоё решение ...',
          Markup.inlineKeyboard([
            Markup.button.callback('Выйти 🏃', 'exit'),
          ])
        );
        return ctx.wizard.next();
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
        await ctx.reply('Возврат к обмену сообщениями.');
        return await ctx.scene.leave();;
      }
    );
    return handler;
  }

  private sendSolutionStep(): Composer<CustomContext> {
    const handler = new Composer<CustomContext>();
    handler.on(
      message("document"),
      async ctx => {
        if (!ctx.message.document) {
          logger.error('sendSolutionStep: no message.document');
          return this.replyExit(ctx);
        }

        const res = await this.controller.sendSolution({
          token: ctx.telegram.token,
          file: {
            fileID: ctx.message.document.file_id,
            fileName: ctx.message.document.file_name,
            mimeType: ctx.message.document.mime_type,
          },
          studentID: ctx.educrm.studentID,
          homeworkID: ctx.wizard.state.targetHomeworkID,
          chatID: ctx.educrm.chatID
        });
        if (!res) {
          await ctx.reply('Упс, что то пошло не так (╥﹏╥)');
        } else {
          await ctx.editMessageText(
            'Решение отправлено!',
            Markup.inlineKeyboard([])
          );
        }
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
        await ctx.reply('Возврат к обмену сообщениями.');
        return await ctx.scene.leave();;
      }
    );
    handler.on(
      "message",
      async ctx => {
        await ctx.replyWithMarkdownV2('В качетсве решения можно отправить *файл* или *фотографию*');
      }
    );
    return handler;
  }

  private async replyExit(ctx: CustomContext) {
    await ctx.reply('Возврат к обмену сообщениями.');
    return await ctx.scene.leave();
  }

}
