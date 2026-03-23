<template>
  <ul
    class="folder-tree-list list-none m-0 p-0"
    :class="{ 'folder-tree-children': depth > 0 }"
  >
    <li v-for="node in nodes" :key="node.path" class="folder-tree-node">
      <div
        class="folder-item folder-tree-row flex cursor-pointer gap-2 items-center px-2.5 transition-colors"
        :class="{
          'folder-item-active': activePath === node.path,
          'surface-panel-muted': contextPath === node.path && activePath !== node.path,
          'folder-item-hover': activePath !== node.path
        }"
        @click="$emit('select', node.path)"
        @contextmenu.prevent="$emit('context-menu', { event: $event, path: node.path })"
      >
        <button
          type="button"
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs text-muted transition-colors hover:text-title"
          @click.stop="$emit('toggle', node.path)"
        >
          <i
            v-if="node.children.length > 0"
            class="text-lg ml-1"
            :class="expandedPaths.has(node.path) ? 'ri-checkbox-indeterminate-line' : 'ri-add-box-line'"
          ></i>
        </button>
        <span class="min-w-0 flex-1 truncate text-sm text-subtle leading-[2.6]" :class="{ 'font-semibold text-primary': activePath === node.path }">
          {{ node.name }}
        </span>
      </div>

      <FolderTree
        v-if="node.children.length > 0 && expandedPaths.has(node.path)"
        :nodes="node.children"
        :active-path="activePath"
        :expanded-paths="expandedPaths"
        :context-path="contextPath"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @context-menu="$emit('context-menu', $event)"
      />
    </li>
  </ul>
</template>

<script setup>
defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  activePath: {
    type: String,
    default: ''
  },
  expandedPaths: {
    type: Object,
    default: () => new Set()
  },
  contextPath: {
    type: String,
    default: ''
  },
  depth: {
    type: Number,
    default: 0
  }
})

defineEmits(['select', 'toggle', 'context-menu'])
</script>
