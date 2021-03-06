import React,{useState,useCallback,useMemo,useRef} from 'react'
import {Tabs,Button,Card} from 'antd'
import Table,{RichTableColumnType} from '@/components/Table'
import FilterForm,{FilterFormFieldType,ControlContextType} from '@/components/FilterForm'
import * as productService from '@/services/product'
import useRequest from '@/common/hooks/useRequest'
import {ConnectRC} from 'umi'

type ProductManage={

}
type ProductRecordDataType={
    productName:string
}
function useTableSelection(options:any={}){
    const {selectedRows:defaultSelectedRows=[],rowKey="id",isStorage=false,onSelect,onChange,...config}=options
    const [selectedRows,setSelectedRows]=useState(defaultSelectedRows)
    const onChangehandle=useCallback((selectedRowKeys,selectedRows)=>{
        selectedRows([...selectedRows])
        onChange&&onChange(selectedRowKeys,selectedRows)
    },[onChange])
    const onSelecthandle=useCallback((record, selected, selectedRows, nativeEvent)=>{
        selectedRows([...selectedRows])
        onSelect&&onSelect(record, selected, selectedRows, nativeEvent)
    },[onSelect])
    let rowSelection
    if(isStorage){
        rowSelection={
            selectedRowKeys:selectedRows.map((d:any)=>d[rowKey]),
            onChange:onChangehandle,
            ...config
        }
    }else{
        rowSelection={
            selectedRowKeys:selectedRows.map((d:any)=>d[rowKey]),
            onSelect:onSelecthandle,
            ...config
        }
    }
    return [rowSelection,{selectedRows,setSelectedRows}]
}
let ProductManage:ConnectRC<ProductManage>=({history})=>{
    let [rowSelection]=useTableSelection()
    let filterRef=useRef<ControlContextType>()
    let [currentStatus,setStatus]=useState<string>('-1')
    let [{tableProps},{query:showList}]=useRequest({
        service:productService.getProductList,
        transform:(res)=>{
            return {
                data:res.list,
                total:res.total
            }
        }
    })
    const fields=useMemo<FilterFormFieldType[]>(()=>[{
        type:"text",
        name:"name",
        label:"商品信息",
        props:{
            placeholder:"请输入商口名称或商品编号"
        }
    },{
        type:"list",
        name:"name2",
        label:"商品归属",
        initialValue:-1,
        data:[{text:"全部",value:-1},{text:"幸福送全国店",value:1},{text:"未分",value:2}]
    },{
        type:"list",
        name:"name3",
        label:"商品状态",
        initialValue:-1,
        data:[{text:"全部",value:-1},{text:"已上架",value:1},{text:"已下架",value:2}],
        props:{
            onChange:(value:string)=>{
                setStatus(""+value)
            }
        }
    }],[])
    const columns=useMemo<RichTableColumnType<ProductRecordDataType>[]>(() =>[{
        title:"商品信息",
        dataIndex:"productidInfo",
        render(text,record){
            return record.productName
        }
    },{
        title:"商品归属",
        dataIndex:"belong"
    },{
        title:"上架状态",
        dataIndex:"statusName"
    },{
        title:"商品状态",
        dataIndex:"statusName"
    },{
        title:"操作"
    }], [])
    const onStatusTabChange=useCallback((value)=>{
        console.log('value',value)
        setStatus(""+value)
        filterRef.current?.form.setFieldsValue({
            name3:Number(value)
        })
    },[])
    const onPublishProduct=useCallback(()=>{

        history.push('/product/product-manage/list/edit')
    },[])

    return <>
      <Card>
        <FilterForm ref={filterRef as any} span={18} fields={fields} onQuery={showList} autoBind={true}>
        <Button type="primary" onClick={onPublishProduct}>发布商品</Button>
            <Button>上架</Button>
            <Button>下架</Button>
            <Button>删除</Button>
        </FilterForm>

        <Tabs activeKey={currentStatus} onChange={onStatusTabChange}>
            <Tabs.TabPane tab="全部" key="-1"></Tabs.TabPane>
            <Tabs.TabPane tab="已上架" key="1"></Tabs.TabPane>
            <Tabs.TabPane tab="已下架" key="2"></Tabs.TabPane>
        </Tabs>
        <Table  rowSelection={rowSelection} columns={columns} rowKey="id" {...tableProps}></Table>
    </Card>
    </>
}

export default ProductManage 