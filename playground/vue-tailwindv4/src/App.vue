<script setup lang="ts">
</script>

<template>
	<div class="wrapper">
		<header class="mb-10">
			<nav class="bg-white border-b border-gray-200 px-2 sm:px-4 py-2.5 rounded">
				<div class="container flex flex-wrap justify-between items-center mx-auto">
					<a href="#" class="flex items-center">
						<span class="self-center text-xl font-semibold whitespace-nowrap">WindUI</span>
					</a>
				</div>
			</nav>
		</header>
		<div class="container px-5 space-y-4">
			<h3 class="text-lg mb-4">Buttons</h3>
			<div class="space-x-4">
				<button class="btn">Default</button>
				<button class="btn c-blue">Primary</button>
				<button class="btn c-green">Success</button>
				<button class="btn c-red">Danger</button>
				<button class="btn c-amber">Warning</button>
				<button class="btn c-sky">Info</button>
			</div>
			<div class="space-x-4">
				<button class="btn v-solid">Default</button>
				<button class="btn v-solid c-blue">Primary</button>
				<button class="btn v-solid c-green">Success</button>
				<button class="btn v-solid c-red">Danger</button>
				<button class="btn v-solid c-amber">Warning</button>
				<button class="btn v-solid c-sky">Info</button>
			</div>
			<div class="space-x-4">
				<button class="btn v-outline">Default</button>
				<button class="btn v-outline c-blue">Primary</button>
				<button class="btn v-outline c-green">Success</button>
				<button class="btn v-outline c-red">Danger</button>
				<button class="btn v-outline c-amber">Warning</button>
				<button class="btn v-outline c-sky">Info</button>
			</div>
			<div class="space-x-4">
				<button class="btn v-light">Default</button>
				<button class="btn v-light c-blue">Primary</button>
				<button class="btn v-light c-green">Success</button>
				<button class="btn v-light c-red">Danger</button>
				<button class="btn v-light c-amber">Warning</button>
				<button class="btn v-light c-sky">Info</button>
			</div>
			<div class="space-x-4">
				<button class="btn s-xs v-light c-amber">Warning</button>
				<button class="btn s-sm v-outline c-sky">Info</button>
				<button class="btn">Default</button>
				<button class="btn v-solid c-red s-lg">Danger</button>
				<button class="btn v-light c-green s-xl">Success</button>
			</div>
			<button class="btn v-outline block w-96 hover:v-default hover:c-blue">Default</button>
			<h3 class="text-lg my-4">Badges</h3>
			<div class="space-x-2">
				<span class="badge c-red">Danger</span>
				<span class="badge c-green">Success</span>
				<span class="badge c-blue">Blue</span>
				<span class="badge c-indigo">Indigo</span>
				<span class="badge c-purple">Purple</span>
				<span class="badge c-pink">Pink</span>
			</div>
		</div>
	</div>
</template>

<style src="./assets/base.css" />
