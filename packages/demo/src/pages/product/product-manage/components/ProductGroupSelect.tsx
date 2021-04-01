import React,{useCallback,useState} from 'react'
import {Select} from 'antd'
import {useControllableValue} from 'ahooks'
import {getProductGroupList} from '@/services/product'
import {debounce} from 'lodash'

let ProductGroupSelect = React.memo(React.forwardRef((props:any,ref) => {
    let { onChange,placeholder='',...restProps } = props
    let [data, setData] = useState([])
    let [value, setValue] = useControllableValue(props,{
        defaultValue:[]
    })

    const handleSearch = useCallback(debounce((value) => {
        if (value) {
            getProductGroupList({
                name:value,
                pageSize:10,
                pageNum:1
            }).then((data:any) => {
                setData(data.list)
            });
        } else {
            setData([])
        }
    },300),[])
    const handleChange  = useCallback((value) => {
        setValue(value);
    },[])
    //const options = data.map(d => <Select.Option key={d.id} value={d.id+""}>{d.name}</Select.Option>);
    const options=data.map((d:any)=>({label:d.name,value:d.id+""}))
    return <Select
        mode="tags"
        showSearch
        value={value}
        style={{width:300}}
        placeholder={placeholder}
        defaultActiveFirstOption={false}
        showArrow={false}
        filterOption={false}
        onSearch={handleSearch}
        onChange={handleChange}
        notFoundContent={null}
        {...restProps}
        options={options}
    >
     
    </Select>
}))

export default ProductGroupSelect