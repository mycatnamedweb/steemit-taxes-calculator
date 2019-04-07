// ==================================== EDIT THESE ============
const TARGET_YEAR = '';
// ============================================================


// utilities
const sleep = (time) => new Promise((res) => setTimeout(res, time));

// transactions counter
const totTransactions = { sbd: 0, steem: 0 };

// sanity check
const user = window.location.href.split('@')[1];
if (!user || user.split('/').length > 1) {
  const msg = 'Wrong domain. You need to execute this script on https://steemdb.com/@your-username-here';
  alert(msg);
  throw new Error(msg);
}
const targetYear = TARGET_YEAR || 2018;

// TRANSFER - PAGE N
const isTransactionToMyself = (all, i) => all[i].parentElement.parentElement.innerText.split('\n')[0].trim().split(' ').pop().slice(-(user.length)) === user;
const isSBDTransaction = (all, i) =>  all[i].parentElement.parentElement.innerText.trim().slice(-3) === 'SBD'
const isSTEEMTransaction = (all, i) =>  all[i].parentElement.parentElement.innerText.trim().slice(-5) === 'STEEM'
const getYear = (target) => target.parentElement.parentElement.innerText.substr(0,4);
const isTargetYearTransactions = (all, i) => getYear(all[i]) === `${targetYear}`;

async function getTransfersSum(win, page) {
  let currentPage = win.document.querySelectorAll('a[class="paginate_button item active"]')[0];
  if (!currentPage) {
    await sleep(5000);
    currentPage = win.document.querySelectorAll('a[class="paginate_button item active"]')[0];
    if (!currentPage) throw new Error('Page load error. Check your internet connection.');
  }
  if (+currentPage.innerText !== page) throw new Error(`Expected page ${page} but current active page is ${currentPage.innerText}!`);
  const all = win.document.querySelectorAll('div[class="ui small header"]');
  if (!all.length) return 404;
  const allSBD = [];
  const allSTEEM = [];
  all.forEach((e,i) => {
    if(isTransactionToMyself(all, i)) {
      if (isTargetYearTransactions(all, i)) {
        if (isSBDTransaction(all, i)) { allSBD.push(e.innerText) }
        else if (isSTEEMTransaction(all, i)) { allSTEEM.push(e.innerText) }
      } else if (getYear(all[1]) === `${targetYear - 1}`) {
        return 404; // stop processing pages if eg. we target 2018 and we arrived to 2017
      }
    }
  });
  let countSBD = 0;
  allSBD.forEach(e => {countSBD+=(+e)});
  let countSTEEM = 0;
  allSTEEM.forEach(e => {countSTEEM+=(+e)});
  return { sbdSum: countSBD, steemSum: countSTEEM };
}

// TRANSACTIONS PAGES SCRAPING
async function scrapeTransactions() {
  console.log(`Scraping Transactions pages to sum transactions for target year ${targetYear}`);
  for (let page = 1; page < 1000; page++) {
    const currentWindow = open(`${window.location.href}/transfers?page=${page}`);
    console.log(`Waiting for transactions page ${page} to load..`);
    await sleep(5000);
    const result = await getTransfersSum(currentWindow, page);
    currentWindow && currentWindow.close && currentWindow.close();
    if (result === 404) {
      console.log(`No transactions found in page ${page}. Stopping.`);
      break;
    }
    const { sbdSum, steemSum } = result;
    console.log(`Sum of transactions on page ${page}: ${sbdSum} SBD, ${steemSum} STEEM`);
    totTransactions.sbd += sbdSum;
    totTransactions.steem += steemSum;
  }
}

// rewards counter
const totRewards = { sbd: 0, steem: 0 };

// CURATION AND AUTHOR REWARDS - PAGE 0 only
const isTargetYearRewards = (all, i, targetYear) => all[i] && all[i].innerText.substr(0,4) === `${targetYear}`;
const getSBDReward = (txt) => txt.split(' SBD')[0].split('	').pop();
const getSTEEMReward = (txt) => txt.split(' STEEM')[0].split('	').pop();

async function getRewardsSum(win) {
  let table = win.document.querySelectorAll('table[class="ui striped sortable table"]')[0];
  if (!table) {
    await sleep(5000);
    table = win.document.querySelectorAll('table[class="ui striped sortable table"]')[0];
    if (!table) throw new Error('Page load error. Check your internet connection.');
  }
  const arr = table.querySelectorAll('tr');
  if (!arr.length) return 500;
  const allSBD = [];
  const allSTEEM = [];
  arr.forEach((e,i) => { if(e && isTargetYearRewards(arr, i, targetYear)) {
    allSBD.push(getSBDReward(e.innerText))
    allSTEEM.push(getSTEEMReward(e.innerText))
  }});
  let countSBD = 0;
  allSBD.forEach(e => {countSBD+=(+e)});
  let countSTEEM = 0;
  allSTEEM.forEach(e => {countSTEEM+=(+e)});
  console.log(`Rewards Page --> SBD: ${countSBD}, STEEM: ${countSTEEM}`);
  return { sbdSum: countSBD, steemSum: countSTEEM };
}

// REWARDS PAGES SCRAPING
async function scrapeRewards() {
  console.log(`Scraping Rewards pages to sum rewards for target year ${targetYear}`);
  const currentWindow = open(`${window.location.href}/authoring`);
  console.log(`Waiting for rewards page to load..`);
  await sleep(10000);
  const result = await getRewardsSum(currentWindow);
  currentWindow && currentWindow.close && currentWindow.close();
  if (result === 500) {
    throw new Error(`Something went wrong. Elements not found on page.`);
  }
  const { sbdSum, steemSum } = result;
  console.log(`Sum of rewards : ${sbdSum} SBD, ${steemSum} STEEM`);
  totRewards.sbd += sbdSum;
  totRewards.steem += steemSum;
}

// SCRIPT EXECUTION AND OUTPUT
await scrapeTransactions();
await scrapeRewards();
const transactionsOutput = `>>>> ${targetYear} TRANSACTIONS: ${totTransactions.sbd.toFixed(2)} SBD + ${totTransactions.steem.toFixed(2)} STEEM`;
const rewardsOutput = `>>>> ${targetYear} REWARDS: ${totRewards.sbd.toFixed(2)} SBD + ${totRewards.steem.toFixed(2)} STEEM`;
const totSumOutput = `= ${(totTransactions.sbd + totRewards.sbd).toFixed(2)} SBD + ${(totTransactions.steem + totRewards.steem).toFixed(2)} STEEM`;
setTimeout(() => alert(`${transactionsOutput}\n${rewardsOutput}\n${totSumOutput}`), 1000);
console.log(transactionsOutput, '\n', rewardsOutput, '\n', totSumOutput);
