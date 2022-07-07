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
		<div class="container px-5 space-x-4">
			<button class="btn">Default</button>
			<button class="btn c-slate">Default</button>
			<button class="btn c-blue">Primary</button>
			<button class="btn c-green">Success</button>
			<button class="btn c-red">Danger</button>
			<button class="btn c-amber">Warning</button>
			<button class="btn c-sky">Info</button>
		</div>
	</div>
</template>

<style src="./assets/base.css" />