import { PageObjectBase } from './PageObjectBase';

class HomePage extends PageObjectBase {
  constructor () {
    super({ path: '/' });
  }
  getCounterValue () {
    const counterValue = parseInt(browser.getText('.Counter .count .value'), 10);
    return counterValue;
  }
}

const homePage = new HomePage();

export {
  homePage
};
