/** @type {EsmPlugin} */
export default (plugin) => {
  let modalApi = null

  const openOverview = () => {
    const { ref, computed, defineComponent, resolveComponent, h } = Vue

    const profilesStore = Plugins.useProfilesStore()
    const subscribesStore = Plugins.useSubscribesStore()

    const component = defineComponent({
      template: /* html */ `
      <Tabs v-model:active-key="activeKey" :items="tabs" tabPosition="top">
        <template #profiles>
          <Table v-if="profiles.length" :columns="profileColumns" :data-source="profiles" />
          <Empty v-else description="暂无配置文件" />
        </template>
        <template #subscriptions>
          <Table v-if="subscribes.length" :columns="subscribeColumns" :data-source="subscribes" />
          <Empty v-else description="暂无订阅" />
        </template>
      </Tabs>
      `,
      setup() {
        const activeKey = ref('profiles')
        const tabs = [
          { key: 'profiles', tab: '配置文件' },
          { key: 'subscriptions', tab: '订阅' }
        ]

        const profiles = computed(() =>
          profilesStore.profiles.map((profile, index) => ({
            id: profile.id,
            index: index + 1,
            name: profile.name,
            current: profilesStore.currentProfile?.id === profile.id
          }))
        )

        const subscribes = computed(() =>
          subscribesStore.subscribes.map((subscribe, index) => ({
            id: subscribe.id,
            index: index + 1,
            name: subscribe.name,
            nodeCount: Array.isArray(subscribe.proxies) ? subscribe.proxies.length : 0
          }))
        )

        const profileColumns = [
          { title: '序号', key: 'index', align: 'center' },
          {
            title: '名称',
            key: 'name',
            customRender: ({ value, record }) => {
              if (!record.current) return value
              return h(resolveComponent('Tag'), { color: 'green' }, () => value)
            }
          }
        ]

        const subscribeColumns = [
          { title: '序号', key: 'index', align: 'center' },
          { title: '名称', key: 'name' },
          {
            title: '节点数量',
            key: 'nodeCount',
            align: 'center',
            customRender: ({ value }) => h(resolveComponent('Tag'), { color: 'primary' }, () => `${value} 个节点`)
          }
        ]

        return { activeKey, tabs, profiles, subscribes, profileColumns, subscribeColumns }
      }
    })

    modalApi = Plugins.modal({
      title: plugin.name,
      submit: false,
      cancelText: 'common.close',
      width: '60',
      height: '60',
      maskClosable: true,
      afterDestroy: () => {
        modalApi = null
      }
    })
    modalApi.setContent(component)
    modalApi.open()
  }

  const onRun = () => {
    openOverview()
    return 0
  }

  const onDispose = () => {
    modalApi?.destroy()
  }

  return { onRun, onDispose }
}
