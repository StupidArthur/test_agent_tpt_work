export async function openSidebarAction(page,name){
 let button=page.getByRole('button',{name,exact:true}).first();
 if(!await button.count()||!await button.isVisible()){
  const more=page.getByRole('button',{name:/^(更多|More)$/}).first();
  if(!await more.count())throw Error('Sidebar action not available: '+name);
  await more.click();button=page.getByRole('button',{name,exact:true}).first();
 }
 await button.waitFor({state:'visible'});await button.click();
}
