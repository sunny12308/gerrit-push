import * as vscode from 'vscode';
import * as path from 'path';

async function mainGerrit(context: vscode.ExtensionContext) {
  const repoRaw = await gitAPI("repos");
  const repos: any = [];
  repoRaw.forEach((value: any, index: number) => {
    const rName = path.basename(value.repository.root);
    const rDesc = [value.repository.headLabel, value.repository.syncLabel]
    .filter(l => !!l)
    .join(' ');
    repos.push({ id: index, label: rName, description: rDesc });
  });
  const repoId: any = await showRepoQuickPick(repos);

  const branchRaw = await gitAPI("branch", "", repoId['id']);
  const branchs: string[] = [];
  branchRaw.forEach(function (value: any) {
    branchs.push(value['name']);
  });
  const branch:any=await showBranchQuickPick(branchs);
 const reviewers:any= await showReviewersInput(context)||'';
  gitAPI("push", `${branch.label}${reviewers||''}`,  repoId['id'],);
}

async function gitAPI(val: string, pushBranch: string = "", id: number = 0) {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  const git = gitExtension?.exports;
  const api = git.getAPI(1);
  if (val === "branch") {
    const repo = api.repositories[id];
    const branch = await repo.getBranches("origin");
    return branch;
  } else if (val === "push") {
    const repo = api.repositories[id];
    repo.push("origin", `HEAD:refs/for/${pushBranch}`)
      .catch((err: any) => {
        vscode.window.showErrorMessage(err.stderr);
      });
  } else if (val === "repos") {
    const repo = api.repositories;
    console.log(repo);
    return repo;
  }
}

async function showRepoQuickPick(val: any) {
  const result = await vscode.window.showQuickPick(val, {
    placeHolder: 'Select your workdir',
  });
  return result;
}

function showBranchQuickPick(codes: any) {
  return vscode.window.showQuickPick(codes.map((label: any) => ({ label })),{
    placeHolder:'Select (or create) HEAD:refs/for/<branch>',
    canPickMany:false
  });
}
async function showReviewersInput(context: vscode.ExtensionContext) {
  // 从 workspaceState 中读取保存的数据
  const storedValue:string = context.workspaceState.get('gerritReviewers') as string;
  let dReviewers:string=storedValue||'';

  let value=await  vscode.window.showInputBox({
    placeHolder:'input reviewers(%r=xx,r=xx)',
    value:dReviewers
  });

  //更新
  context.workspaceState.update('gerritReviewers', value);
  return value;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('gerrit.push', function(){
    mainGerrit(context);
  });
  context.subscriptions.push(disposable);
}
export function deactivate() { }