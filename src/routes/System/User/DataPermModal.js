import React, { Component } from 'react';
import { Modal, Tree, Icon, Button, Checkbox, Table, Row, Col } from 'antd';
import { connect } from "dva";
import { getIntlContent } from '../../../utils/IntlUtils';

const { TreeNode } = Tree;

@connect(({ dataPermission, resource, global, loading }) => ({
  dataPermission,
  resource,
  global,
  selectorPermisionLoading: loading.effects["dataPermission/fetchDataPermisionSelectors"],
  rulePermisionLoading: loading.effects["dataPermission/fetchDataPermisionRules"]
}))
export default class DataPermModal extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentPlugin:null,
      currentPermissionSelectorPage: 1,
      selectorData: null,
      pageSize: 12,
      ruleListMap:{}
    };
  }

  componentWillMount() {
    this.getPluginTreeData();
  }

  getPluginTreeData = () => {
    const { dispatch } = this.props;
    dispatch({
      type: "resource/fetchMenuTree"
    });
    dispatch({
      type: "global/fetchPlugins",
      payload: {
        callback: () => {}
      }
    });
  }

  getPermissionSelectorList = page => {
    const { dispatch, userId } = this.props;
    const { currentPlugin, pageSize } = this.state;
    dispatch({
      type: "dataPermission/fetchDataPermisionSelectors",
      payload: {
        currentPage: page,
        pageSize,
        userId,
        pluginId: currentPlugin.pluginId
      },
      callback: (res)=>{
        this.setState({
          selectorData: res
        })
      }
    });
  }

  getPermissionRuleList = (selectorId, page) => {
    const { dispatch, userId } = this.props;
    let { currentPlugin, ruleListMap, pageSize } = this.state;
    dispatch({
      type: "dataPermission/fetchDataPermisionRules",
      payload: {
        currentPage: page,
        pageSize,
        userId,
        pluginId: currentPlugin.pluginId,
        selectorId
      },
      callback: (res) =>{
        if(res.dataList && res.dataList.length > 0) {
          res.dataList.forEach(e=>{
            e.selectorId = selectorId;
          })
        }
        if(ruleListMap[selectorId] && ruleListMap[selectorId].currentRulePage) {
          res.currentRulePage = ruleListMap[selectorId].currentRulePage;
        } else {
          res.currentRulePage = 1;
        }
        ruleListMap[selectorId] = res;
        this.setState({
          ruleListMap
        })
      }
    });
  }

  onSelectPlugin = (selectedKeys, e) => {
    const currentPlugin = e.node.props.dataRef;
    this.setState({
      currentPlugin,
      currentPermissionSelectorPage: 1,
      ruleListMap: {}
    }, () => {
      this.getPermissionSelectorList(1);
    })
  }

  handleCheckSelector = (record) => {
    const { dispatch, userId } = this.props;
    const { currentPermissionSelectorPage } = this.state;
    let type = record.isChecked ? "dataPermission/deletePermisionSelector" : "dataPermission/addPermisionSelector";
    dispatch({
      type,
      payload: {
        dataId: record.dataId,
        userId
      },
      callback: () => {
        this.getPermissionSelectorList(currentPermissionSelectorPage)
        this.getPermissionRuleList(record.dataId,1)
      }
    })
  }

  handleCheckRule = (record) => {
    const { dispatch, userId } = this.props;
    const { currentPermissionSelectorPage, ruleListMap } = this.state;
    let type = record.isChecked ? "dataPermission/deletePermisionRule" : "dataPermission/addPermisionRule";
    dispatch({
      type,
      payload: {
        dataId: record.dataId,
        userId
      },
      callback: () => {
        this.getPermissionSelectorList(currentPermissionSelectorPage)
        let page = ruleListMap[record.selectorId].currentRulePage || 1;
        this.getPermissionRuleList(record.selectorId,page)
      }
    })
  }

  handleExpandRuleTable = (expanded, record) => {
    this.getPermissionRuleList(record.dataId,1)
  }

  selectorPageOnchange = page => {
    this.setState({ currentPermissionSelectorPage: page });
    this.getPermissionSelectorList(page);
  };

  rulePageOnchange = (page, selectorId) => {
    let { ruleListMap } = this.state;
    ruleListMap[selectorId].currentRulePage = page;
    this.setState({
      ruleListMap
    },()=>{
      this.getPermissionRuleList(selectorId,page);
    })
    
  }

  renderPluginTree = ()=>{
    let { global: { plugins }, resource: { menuTree } } = this.props;
    let pluginMenuList = menuTree.filter(e=>e.url === "/plug");

    if(pluginMenuList && pluginMenuList.length > 0){
      pluginMenuList[0].children.forEach(p => {
        if(plugins.some(e => e.name === p.name)) {
          p.pluginId = plugins.filter(e => e.name === p.name)[0].id;
        }
      })
      return (
        <Tree
          style={{background:"white"}}
          defaultExpandAll
          onSelect={this.onSelectPlugin}
          showIcon
        >
          {this.renderTreeNodes(pluginMenuList)}
        </Tree>
      )
    }
  } 

  renderTreeNodes = (data) => {
    data = data.sort((a,b)=>(a.sort||0)-(b.sort||0));
    return data.map(item => {
      item.title =  item.meta.title;
      if (item.title.startsWith("SOUL.")) {
        item.title = getIntlContent(item.title);
      }
      if (item.children && item.children.length > 0) {
        return (
          <TreeNode selectable={false} title={item.title} icon={item.meta.icon&&<Icon type={item.meta.icon} />} key={item.id} dataRef={item}>
            {this.renderTreeNodes(item.children)}
          </TreeNode>
        );
      } else {
        return <TreeNode icon={item.meta.icon&&<Icon type={item.meta.icon} />} title={item.title} key={item.id} dataRef={item} />;
      }
    });
  }

  renderSelectorRuleTable = () => {
    const { 
      currentPermissionSelectorPage,
      pageSize
    } = this.state;
    const { selectorData, ruleListMap } = this.state;
    const ruleColumns = [
      { 
        title: getIntlContent("SOUL.SYSTEM.DATA.PERMISSION.CHECKED"),
        dataIndex: 'isChecked', 
        width:90,
        key: 'isChecked',
        render: (isChecked, record) => {
          return <Checkbox checked={isChecked} onClick={this.handleCheckRule.bind(this,record)}  />
        }
      },
      { title: getIntlContent("SOUL.SYSTEM.DATA.PERMISSION.RULENAME"), dataIndex: 'dataName', key: 'dataName' },
    ];
    const expandedRowRender = (record) => {
      let ruleData = ruleListMap&&ruleListMap[record.dataId];
      let currentRulePage = ruleData&&ruleData.currentRulePage;
      return (
        <Table 
          size="small"
          bordered
          columns={ruleColumns}
          dataSource={ruleData&&ruleData.dataList}
          pagination={{
            total: (ruleData&&ruleData.total) || 0,
            current: currentRulePage || 1,
            pageSize,
            onChange: (page) => {
              this.rulePageOnchange(page,record.dataId);
            }
          }}
        />
      );
    };
  
    const columns = [
      { 
        title: getIntlContent("SOUL.SYSTEM.DATA.PERMISSION.CHECKED"),
        dataIndex: 'isChecked', 
        width:90,
        key: 'isChecked',
        render: (isChecked, record) => {
          return <Checkbox checked={isChecked} onClick={this.handleCheckSelector.bind(this,record)} />
        }
      },
      { 
        title: getIntlContent("SOUL.SYSTEM.DATA.PERMISSION.SELECTORNAME"),
        dataIndex: 'dataName', 
        key: 'dataName'
      },
    ];
  
    return (
      <Table
        style={{width:"350px"}} 
        size="small" 
        bordered
        columns={columns}
        expandedRowRender={expandedRowRender}
        dataSource={selectorData&&selectorData.dataList}
        onExpand={this.handleExpandRuleTable}
        pagination={{
          total: selectorData&&selectorData.total,
          current: currentPermissionSelectorPage,
          pageSize,
          onChange: this.selectorPageOnchange
        }}
      />
    );
  }

  render() {
    let { handleCancel } = this.props;
    return (
      <Modal
        width={800}
        centered
        title={getIntlContent("SOUL.SYSTEM.DATA.PERMISSION.CONFIG")}
        visible
        cancelText={getIntlContent("SOUL.COMMON.CLOSE")}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            {getIntlContent("SOUL.COMMON.CLOSE")}
          </Button>
        ]} 
      >
        <Row gutter={20}>
          <Col span={10} style={{minWidth:280}}>
            {this.renderPluginTree()}
          </Col>
          <Col span={14}>
            {this.renderSelectorRuleTable()}
          </Col>
        </Row>
      </Modal>
    )
  }
}
