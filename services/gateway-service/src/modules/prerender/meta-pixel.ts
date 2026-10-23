export function metaPixelHead(pixel_id: string | null | undefined, nonce: string | undefined): string {
  if (!pixel_id || !/^[0-9]{5,25}$/.test(pixel_id) || !nonce || !/^[A-Za-z0-9+/_=-]+$/.test(nonce)) return ''
  return `<!-- Meta Pixel Code -->
<script nonce="${nonce}" data-meta-pixel-id="${pixel_id}">
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixel_id}');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`
}
