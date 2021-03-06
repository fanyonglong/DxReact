export default [
    {
       path: '/',
       component: '@/layouts/BlankLayout',
       routes:[
         {
             path:"/login",
             exact:true,
             component:"login"
         },{
           path:"/",
           component:"@/layouts/SecurityLayout",
           routes:[{
              path:"/",
              component:"@/layouts/BasicLayout",
              routes:[{
                  path:"/",
                  name:"首页",
                  component:"@/pages/index"
              },{
                  name:"用户管理",
                  path:"/users",
                  routes:[{
                      path:"/users",
                      redirect:"/users/user-list"
                  },{
                      name:"用户列表",
                      path:"/users/user-list",
                      component:"users/UserList",
                      authority:'0'
                  }]
              },{
                name:"商品",
                path:"/product",
                routes:[{
                    name:"商品管理",
                    path:"/product/product-manage",
                    routes:[{
                        name:"商品管理",
                        key:"productManage",
                        path:"/product/product-manage/list",
                        component:"product/product-manage",
                        authority:'0'
                    },{
                        name:"发布商品",
                        hideInMenu:true,
                        path:"/product/product-manage/list/edit",
                        component:"@/pages/product/product-manage/product-edit",
                        parentKeys:['productManage']
                    },{
                        name:"商品分组",
                        path:"/product/product-manage/group",
                        component:"product/product-manage/product-group",
                        authority:'0'
                    },{
                        name:"商品列表",
                        path:"/product/product-manage/list2",
                        component:"product/product-manage/product-list",
                        authority:'0'
                    }]
                }]
            }]
           }]
         }
       ]
  }]